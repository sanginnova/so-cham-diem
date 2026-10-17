import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const mode = process.argv[2] || 'journal';
if (!['journal', 'backup'].includes(mode)) throw new Error('Dùng journal hoặc backup.');
if (mode === 'backup') {
  if (git('status', '--porcelain')) {
    throw new Error('Còn thay đổi chưa commit. Kiểm tra git status và commit các tệp cần lưu trước khi sao lưu.');
  }
  mkdirSync('version-backups', { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = `version-backups/app-${stamp}-${git('rev-parse', '--short', 'HEAD')}.bundle`;
  git('bundle', 'create', path, '--all');
  git('bundle', 'verify', path);
  console.log(`Đã tạo và xác minh: ${path}`);
} else {
  const entries = git('log', '--date=short', '--format=%H%x09%ad%x09%s').split('\n');
  const rows = entries.map(line => {
    const [hash, date, ...subject] = line.split('\t');
    return `| \`${hash}\` | ${date} | ${subject.join(' ').replaceAll('|', '\\|')} |`;
  });
  writeFileSync('NHAT_KY_PHIEN_BAN.md', [
    '# Nhật ký phiên bản ứng dụng', '',
    'Sinh từ lịch sử Git bằng `npm run versions:journal`. Mới nhất ở trên. Ngày là ngày commit, không xác nhận ngày triển khai.', '',
    'Mỗi mã commit là một mốc mã nguồn có thể mở lại. Xem [hướng dẫn khôi phục](KHOI_PHUC_PHIEN_BAN.md).', '',
    '| Mã phiên bản (commit) | Ngày | Thay đổi |',
    '| --- | --- | --- |', ...rows, '',
  ].join('\n'), 'utf8');
  console.log(`Đã ghi ${entries.length} mốc vào NHAT_KY_PHIEN_BAN.md.`);
}
