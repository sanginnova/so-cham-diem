with open('src/components/SettingsBackupView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Check and X to imports
old_imp = """  Sliders,
  Sparkles,
  Smartphone,
} from 'lucide-react';"""

new_imp = """  Sliders,
  Sparkles,
  Smartphone,
  Check,
  X,
} from 'lucide-react';"""

if old_imp in content:
    content = content.replace(old_imp, new_imp)
    print('Import Check, X added!')
else:
    print('Failed to find old_imp!')

# 2. Safe date in restorePreview
old_date = "{restorePreview.exportedAt ? new Date(restorePreview.exportedAt).toLocaleString('vi-VN') : '—'}"
new_date = """{(() => {
                    if (!restorePreview.exportedAt) return '—';
                    try {
                      const d = new Date(restorePreview.exportedAt);
                      return isNaN(d.getTime()) ? String(restorePreview.exportedAt) : d.toLocaleString('vi-VN');
                    } catch {
                      return String(restorePreview.exportedAt);
                    }
                  })()}"""

if old_date in content:
    content = content.replace(old_date, new_date)
    print('Safe date formatting updated!')
else:
    print('Failed to find old_date!')

with open('src/components/SettingsBackupView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done writing SettingsBackupView.tsx')
