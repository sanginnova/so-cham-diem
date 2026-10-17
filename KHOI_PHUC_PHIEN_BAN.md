# Lưu và quay lại phiên bản app

Mã commit trong NHAT_KY_PHIEN_BAN.md xác định chính xác từng phiên bản mã nguồn. Số phiên bản hiển thị trong app có thể được dùng cho nhiều commit nên không đủ để xác định bản khôi phục.

## Sau mỗi lần cập nhật

1. Kiểm tra `git status` và `git diff`; chỉ thêm những tệp cần lưu bằng `git add <đường-dẫn>`.
2. Chạy kiểm tra phù hợp với thay đổi, rồi `git commit -m "Mô tả thay đổi"`.
3. Chạy `npm run versions:journal`, rồi lưu nhật ký bằng `git add NHAT_KY_PHIEN_BAN.md` và `git commit -m "docs: cập nhật nhật ký phiên bản"`. Nhật ký liệt kê các commit đã tồn tại khi chạy lệnh.
4. Chạy `npm run versions:backup` khi thư mục làm việc sạch. Lệnh tạo tệp Git bundle chứa toàn bộ lịch sử và các nhánh/thẻ Git hiện có, rồi xác minh tệp.
5. Chép tệp trong `version-backups/` sang ổ đĩa hoặc nơi lưu trữ khác. Tệp này không được tự tải lên mạng.

## Mở lại bản cũ mà vẫn giữ thư mục đang làm việc

Tra mã commit trong nhật ký, thay MA_COMMIT và TEN_MOC dưới đây bằng giá trị thực. Chọn tên thư mục mới chưa tồn tại, nằm trong nơi bạn có quyền ghi:

```powershell
git worktree add --detach "../so-cham-diem-TEN_MOC" MA_COMMIT
Set-Location "../so-cham-diem-TEN_MOC"
npm ci
npm run dev
```

Muốn tiếp tục sửa bản cũ, chạy `git switch -c codex/khoi-phuc-TEN_MOC` trong thư mục vừa tạo. Không cần reset hoặc ghi đè nhánh hiện tại.

## Khôi phục từ bản sao lưu khi mất thư mục mã nguồn

```powershell
git clone "DUONG_DAN_TEP.bundle" "so-cham-diem-khoi-phuc"
Set-Location "so-cham-diem-khoi-phuc"
git log --oneline
```

Sau đó chọn commit và mở theo hướng dẫn trên. Cần Git, Node.js và kết nối để cài lại dependencies.

## Phạm vi khôi phục

- Git/bundle lưu mã nguồn đã commit, không chứa node_modules, bản build hoặc các tệp bị Git bỏ qua; thay đổi chưa commit không nằm trong bản sao lưu.
- Điểm, học sinh, tài khoản và dữ liệu Firebase không được khôi phục theo mã nguồn. Xuất bản sao lưu dữ liệu riêng bằng chức năng sao lưu của app trước thay đổi lớn. Nhập JSON hiện tại là bổ sung dữ liệu, không phải khôi phục database nguyên trạng về một thời điểm.
- Mở phiên bản cũ bằng npm run dev vẫn có thể kết nối Firebase thật theo cấu hình của bản đó. Không nhập/sửa/xóa dữ liệu khi chỉ kiểm tra giao diện; dùng emulator hoặc project thử nghiệm nếu cần thử ghi dữ liệu.
- Mở bản cũ trên máy không đổi website đang chạy. Triển khai lại Hosting/rules là thao tác riêng; cần kiểm tra tương thích dữ liệu và phân quyền trước khi triển khai.
- Các thay đổi chưa từng commit hoặc sao lưu trước đây không thể được tái tạo bằng nhật ký này.
