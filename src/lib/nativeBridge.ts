import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

export const isNativePlatform = Capacitor.isNativePlatform();

/**
 * Kích hoạt phản hồi rung xúc giác trên điện thoại Android/iOS
 */
export async function triggerNativeHaptic(type: 'light' | 'medium' | 'success' | 'warning' = 'light') {
  if (!isNativePlatform) return;
  try {
    switch (type) {
      case 'light':
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'medium':
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'success':
        await Haptics.notification({ type: NotificationType.Success });
        break;
      case 'warning':
        await Haptics.notification({ type: NotificationType.Warning });
        break;
    }
  } catch {
    // Bỏ qua nếu thiết bị không hỗ trợ haptics
  }
}

/**
 * Cấu hình thanh trạng thái (StatusBar) và phím Back phần cứng trên Android
 */
export function initNativeShell(options?: { onBackHandled?: () => boolean }) {
  if (!isNativePlatform) return;

  // 1. Cấu hình Status Bar
  try {
    StatusBar.setStyle({ style: Style.Dark });
    StatusBar.setBackgroundColor({ color: '#1E40AF' }); // Xanh thương hiệu CĐN01
  } catch {
    // Không chạy trên web
  }

  // 2. Bắt phím Back phần cứng Android
  try {
    CapApp.addListener('backButton', ({ canGoBack }) => {
      // Nếu có modal đang mở hoặc logic xử lý riêng
      if (options?.onBackHandled && options.onBackHandled()) {
        return;
      }
      if (canGoBack) {
        window.history.back();
      } else {
        CapApp.exitApp();
      }
    });
  } catch {
    // Không chạy trên web
  }
}
