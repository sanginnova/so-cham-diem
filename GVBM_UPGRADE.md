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

Đã làm bản đầu trong mã nguồn local ngày 17/10/2026, chưa triển khai website/rules:

- Khi tạo sổ bộ môn mới, chọn danh sách riêng hoặc dùng chung từ một workspace cùng giáo viên, tên lớp và năm học. Mỗi workspace bộ môn vẫn xác định một môn và giáo viên phụ trách.
- Sổ bộ môn theo dõi danh sách lớp nguồn theo thời gian thực; giữ nguyên ID học sinh, lưu điểm riêng theo ID workspace môn. Thay tên học sinh ở nguồn không làm mất điểm cũ. Bản ghi điểm của học sinh rời danh sách vẫn được giữ trong sổ, không tự xóa.
- Mục Học sinh của sổ liên kết dẫn về lớp nguồn để quản lý. Chặn thêm/sửa/xóa/nhập/khôi phục danh sách riêng tại sổ liên kết. Giao diện chặn xóa hoặc đổi tên/năm học lớp nguồn khi có sổ phụ thuộc.
- Không liên kết chéo giáo viên, năm học, tên lớp hoặc tạo chuỗi nguồn qua nhiều sổ. Rules kiểm tra nguồn khi tạo cấu hình, giữ liên kết bất biến khi sửa cấu hình và chặn tạo học sinh riêng trong sổ liên kết.
- Sổ cũ không tự gộp hoặc đổi nguồn. Sao lưu nhập vào cũng không được thay liên kết nguồn hiện tại. Chưa có công cụ đối chiếu/gộp sổ cũ và chưa có phân công nhiều giáo viên cùng một lớp chung toàn trường.
- Chia sẻ danh sách hiện áp dụng cho sổ điểm bộ môn; nhật ký nề nếp, khoản thu và báo cáo GVCN vẫn thuộc workspace cũ. Nếu lớp nguồn biến mất hoặc không tải được, sổ báo lỗi thay vì tự thay bằng danh sách rỗng để nhập điểm.

Kiểm tra: 12 kiểm thử danh sách/cache/backup/phạm vi lớp, 20 kiểm thử Firestore Rules/emulator, TypeScript và build đạt. Chưa đăng nhập và thao tác dữ liệu thật trên giao diện.

Chạy thử bằng `npm run dev`, mở địa chỉ Vite trả về. Chạy trên localhost vẫn sử dụng Firebase theo cấu hình hiện tại; không phải chế độ offline. Chưa triển khai rules bước 2/3 nên phần đồng bộ sổ điểm trên project thật chưa sẵn sàng. Kiểm thử dữ liệu ghi của bước này được thực hiện trên emulator project demo, không thay đổi database thật.

## Bước 4 — Chốt sổ và lịch sử

Thêm khóa theo lớp/môn/học kỳ, audit sửa điểm, trạng thái vắng/miễn/kiểm tra bù và phiên bản công thức tính điểm. Xác nhận quy tắc đánh giá áp dụng trước khi thay đổi công thức.

Mỗi bước lưu commit riêng, cập nhật NHAT_KY_PHIEN_BAN.md và tạo Git bundle theo KHOI_PHUC_PHIEN_BAN.md.
