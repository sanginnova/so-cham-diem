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

Đã thực hiện trong mã nguồn ngày 17/10/2026:

- Rules riêng cho subjectGradebooks: giáo viên sở hữu và quản trị truy cập theo classConfig; lớp trưởng, khách, giáo viên khác và tài khoản bị khóa bị từ chối. Chặn list toàn bộ và xóa sổ. Kiểm tra lớp, chủ sở hữu, năm học, môn, số cột và revision khi ghi.
- Lưu bằng transaction, tăng revision mỗi lần. Thiết bị đang sửa bản cũ không được tự ghi đè bản mới; cần xuất Excel để giữ bản đang sửa rồi tải lại bản máy chủ.
- Cache/bản nháp riêng theo UID và workspace; lưu nháp trước khi chuyển màn hình, cảnh báo đóng trang khi còn thay đổi. Khi quay lại có bản nháp, yêu cầu bấm Lưu để thử đồng bộ.
- Khóa các ô nhập trong lúc lưu để không mất thay đổi mới do một yêu cầu lưu cũ hoàn tất sau đó. Không chạy nhiều yêu cầu lưu đồng thời trong cùng màn hình.
- Chỉ thông báo đồng bộ thành công sau khi transaction hoàn tất. Lỗi hiển thị riêng, dừng tự thử lặp; nút Lưu dùng để thử lại.
- Mở sổ ở chế độ cloud yêu cầu đọc được máy chủ trước khi sửa. Khi mất mạng, bản nháp vẫn được giữ, cần có mạng để mở lại; chưa hỗ trợ sửa offline trong chế độ cloud.
- Khôi phục cache kiểu cũ có cùng lớp/môn/năm học khi chưa có bản máy chủ, sau khi xác nhận quyền đọc máy chủ của chủ lớp; giữ nguyên khóa cache cũ. Chế độ local cũng đọc được cache cũ.
- Sổ cũ chưa có revision được nâng thành revision 1 ở lần lưu đầu.

Kiểm tra: 19 kiểm thử Firestore Rules/emulator (gồm quyền sổ điểm, bản cũ, tài khoản khóa và xung đột revision), 3 kiểm thử cache/danh sách lớp, TypeScript và build đạt. Chưa kiểm thử thao tác trực tiếp trên giao diện trình duyệt.

Chưa triển khai Firebase thật. Cần triển khai rules và Hosting tương ứng trước khi sử dụng đồng bộ trên website. Bản nháp giữ trên trình duyệt hiện tại, không thay thế bản sao lưu dữ liệu; không có cơ chế tự gộp điểm giữa hai thiết bị. Rules bước này kiểm tra quyền và cấu trúc sổ, chưa xác thực từng điểm bên trong map grades; giao diện kiểm tra thang điểm 0–10.

## Bước 3 — Danh sách lớp dùng chung và phân công

Tách lớp/năm học, học sinh trong lớp và phân công lớp/môn/giáo viên. Có phương án đối chiếu trùng học sinh và bản sao lưu trước chuyển đổi; không tự gộp/xóa các sổ cũ.

## Bước 4 — Chốt sổ và lịch sử

Thêm khóa theo lớp/môn/học kỳ, audit sửa điểm, trạng thái vắng/miễn/kiểm tra bù và phiên bản công thức tính điểm. Xác nhận quy tắc đánh giá áp dụng trước khi thay đổi công thức.

Mỗi bước lưu commit riêng, cập nhật NHAT_KY_PHIEN_BAN.md và tạo Git bundle theo KHOI_PHUC_PHIEN_BAN.md.
