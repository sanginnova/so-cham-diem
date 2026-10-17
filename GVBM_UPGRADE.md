# Nâng cấp GVBM theo từng bước

## Bước 1 — Lớp tôi dạy (17/10/2026)

- Thêm trang Lớp tôi dạy trên sidebar và lối vào GVBM trên điện thoại.
- Lọc năm học, môn học, tìm lớp/môn và mở sổ điểm theo mã workspace.
- Cho phép cùng tên lớp/năm học có nhiều môn và cùng tồn tại với lớp chủ nhiệm. Chặn trùng giáo viên/lớp/năm học/loại lớp/môn, có chuẩn hóa khoảng trắng và chữ hoa/thường.
- Giữ cấu trúc lưu trữ và ID cũ. Mỗi sổ môn vẫn có danh sách học sinh độc lập; chưa phải danh sách lớp dùng chung.
- Giữ nhãn cột TX đã lưu khi mở lại sổ điểm.
- Chặn lớp trưởng mở màn hình sổ điểm qua tab ứng dụng.

Kiểm tra: TypeScript, build và tests/teachingWorkspaces.test.ts. Chưa triển khai website, chưa thay đổi database thật.

## Bước 2 — Quyền và đồng bộ sổ điểm

Ưu tiên bổ sung rules riêng cho subjectGradebooks (rules hiện tại chưa khai báo collection này), kiểm thử emulator cho giáo viên sở hữu/lớp trưởng/tài khoản khác, rồi triển khai đồng bộ service và rules. Kiểm tra cache theo tài khoản, lưu khi chuyển lớp, xung đột nhiều thiết bị và thông báo lỗi đồng bộ. Hiện tại không coi lưu local thành công là xác nhận dữ liệu đã lên Firebase.

## Bước 3 — Danh sách lớp dùng chung và phân công

Tách lớp/năm học, học sinh trong lớp và phân công lớp/môn/giáo viên. Có phương án đối chiếu trùng học sinh và bản sao lưu trước chuyển đổi; không tự gộp/xóa các sổ cũ.

## Bước 4 — Chốt sổ và lịch sử

Thêm khóa theo lớp/môn/học kỳ, audit sửa điểm, trạng thái vắng/miễn/kiểm tra bù và phiên bản công thức tính điểm. Xác nhận quy tắc đánh giá áp dụng trước khi thay đổi công thức.

Mỗi bước lưu commit riêng, cập nhật NHAT_KY_PHIEN_BAN.md và tạo Git bundle theo KHOI_PHUC_PHIEN_BAN.md.
