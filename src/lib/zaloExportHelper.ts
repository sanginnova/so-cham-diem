/**
 * Utility functions for exporting and copying images to Zalo
 * Supports multi-layer fallback:
 * 1. Direct Clipboard API with ClipboardItem (Chrome, Safari, Edge, Firefox)
 * 2. Fallback DOM Image selection + document.execCommand('copy')
 * 3. Synthetic ClipboardEvent dataTransfer
 * 4. Web Share API (Mobile Safari, Mobile Chrome to Zalo app)
 * 5. Automatic high-res download
 */

export interface ClipboardResult {
  success: boolean;
  message?: string;
  isBlocked?: boolean;
  method?: 'navigator-clipboard' | 'dom-selection' | 'copy-event';
}

/**
 * Copies a PNG Blob into the system clipboard with multi-browser compatibility
 */
export async function copyBlobToClipboard(
  blob: Blob,
  dataUrl?: string
): Promise<ClipboardResult> {
  // Ensure window has focus
  try {
    if (typeof window !== 'undefined' && window.focus) {
      window.focus();
    }
  } catch (e) {
    // Ignore focus error
  }

  // 1. Try standard Navigator Clipboard API with ClipboardItem
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
    // Check permission if query is available
    let canWrite = true;
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const perm = await navigator.permissions.query({ name: 'clipboard-write' as any });
        if (perm.state === 'denied') {
          canWrite = false;
        }
      }
    } catch (e) {
      // Permission query not supported on some browsers, proceed to try
    }

    if (canWrite) {
      try {
        // Direct Blob format (Chrome 76+, Firefox 127+, Safari 13.1+)
        const item = new ClipboardItem({
          'image/png': blob,
        });
        await navigator.clipboard.write([item]);
        return { success: true, method: 'navigator-clipboard' };
      } catch (err1: any) {
        console.warn('Direct ClipboardItem write failed, trying Promise blob:', err1);
        try {
          // Safari-specific: Promise-based ClipboardItem
          const item = new ClipboardItem({
            'image/png': Promise.resolve(blob),
          });
          await navigator.clipboard.write([item]);
          return { success: true, method: 'navigator-clipboard' };
        } catch (err2: any) {
          console.warn('Promise ClipboardItem also failed:', err2);
        }
      }
    }
  }

  // 2. Fallback: DOM Image Selection + document.execCommand('copy')
  // This is the classic, reliable technique used when navigator.clipboard is restricted in iframes
  if (typeof document !== 'undefined' && dataUrl) {
    try {
      const container = document.createElement('div');
      container.contentEditable = 'true';
      container.setAttribute('aria-hidden', 'true');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '1px';
      container.style.height = '1px';
      container.style.overflow = 'hidden';
      container.style.opacity = '0';

      const img = document.createElement('img');
      img.src = dataUrl;
      container.appendChild(img);
      document.body.appendChild(container);

      // Focus the container and select image
      container.focus();
      const range = document.createRange();
      range.selectNode(img);

      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);

        const copied = document.execCommand('copy');
        selection.removeAllRanges();
        document.body.removeChild(container);

        if (copied) {
          return { success: true, method: 'dom-selection' };
        }
      } else {
        document.body.removeChild(container);
      }
    } catch (domErr) {
      console.warn('DOM selection copy failed:', domErr);
    }
  }

  // 3. Fallback: Synthetic ClipboardEvent listener
  if (typeof document !== 'undefined') {
    try {
      let eventSucceeded = false;
      const onCopy = (e: ClipboardEvent) => {
        e.preventDefault();
        if (e.clipboardData) {
          try {
            e.clipboardData.clearData();
            const file = new File([blob], 'phieu_ren_luyen.png', { type: 'image/png' });
            e.clipboardData.items.add(file);
            if (dataUrl) {
              e.clipboardData.setData('text/html', `<img src="${dataUrl}" alt="Phiếu rèn luyện" />`);
            }
            eventSucceeded = true;
          } catch (e) {
            console.warn('ClipboardEvent set data failed:', e);
          }
        }
      };

      document.addEventListener('copy', onCopy);
      try {
        document.execCommand('copy');
      } finally {
        document.removeEventListener('copy', onCopy);
      }

      if (eventSucceeded) {
        return { success: true, method: 'copy-event' };
      }
    } catch (evtErr) {
      console.warn('ClipboardEvent fallback failed:', evtErr);
    }
  }

  return {
    success: false,
    isBlocked: true,
    message: 'Trình duyệt đang hạn chế ghi hình ảnh vào bộ nhớ tạm tự động.',
  };
}

/**
 * Shares image using Mobile Web Share API directly to Zalo app if supported
 */
export async function shareImageFile(
  blob: Blob,
  fileName: string,
  title: string,
  text?: string
): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.share) {
    return false;
  }

  try {
    const file = new File([blob], `${fileName}.png`, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title,
        text,
        files: [file],
      });
      return true;
    }
  } catch (e) {
    if ((e as Error)?.name !== 'AbortError') {
      console.warn('Web share failed:', e);
    }
  }
  return false;
}

/**
 * Downloads a blob as a PNG file
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/**
 * Opens Zalo Web in a new tab
 */
export function openZaloWeb(): void {
  window.open('https://chat.zalo.me', '_blank', 'noopener,noreferrer');
}
