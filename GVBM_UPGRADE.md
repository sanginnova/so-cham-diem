# Nâng cấp GVBM theo từng bước

## Dùng sổ điểm trên máy khi rules chưa triển khai

Nếu tải sổ máy chủ bị từ chối, chọn “Dùng sổ điểm trên máy”. Lựa chọn được nhớ theo tài khoản trên trình duyệt. Điểm lưu riêng theo tài khoản và lớp trong localStorage, không gửi Firebase; danh sách học sinh vẫn lấy từ lớp đã đăng nhập. Khôi phục bản nháp/cache cũ nếu khớp lớp, môn, năm học và chủ sở hữu. Có thông báo thường trực và nút thử lại máy chủ. Điểm local không tự nhập/gộp lên máy chủ khi chuyển lại; cần xuất Excel để giữ bản sao. Không phải chế độ offline toàn ứng dụng.

## Sửa tách menu Học lực / Rèn luyện (17/10/2026)

Lựa chọn phân hệ được giữ riêng với tab đang mở. Học lực hiển thị Lớp tôi dạy, Danh sách học sinh, Sổ điểm và các mục hệ thống chung; ẩn nhóm nề nếp, báo cáo rèn luyện, phụ huynh và trợ lý GVCN. Rèn luyện ẩn nhóm bộ môn. Mở Học sinh/Cài đặt/Quản trị không tự đổi phân hệ. Đồng bộ trạng thái nút chuyển ở sidebar, header và di động; ẩn nút ghi nhận nề nếp, link thi đua và xuất Sổ chủ nhiệm khi ở Học lực. TypeScript và build đạt; chưa kiểm tra màn hình đã đăng nhập trong trình duyệt của người dùng. Chỉ cập nhật mã nguồn local.

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

Đã bổ sung bản đầu cho sổ lưu trên máy: chốt/mở lại từng học kỳ, mở lại bắt buộc có lý do; khóa ô nhập và cấu hình cột khi chốt. Giữ điểm trung bình của học kỳ đã chốt khi mở lại sổ. Lịch sử ghi người thao tác, thời gian, học kỳ và giá trị trước/sau cho sửa điểm/cột, chốt/mở sổ; có thể tải toàn bộ sổ kèm lịch sử thành JSON. Công thức hiện tại được đánh dấu weighted-v1 khi chốt, không đổi cách tính. Kiểm thử riêng cho điểm 0/ô trống, khóa sửa điểm/cột, học kỳ khác, lý do mở khóa và lưu/mở lại cache.

Phạm vi: chỉ chế độ lưu sổ trên máy, chưa triển khai hoặc bổ sung khóa/audit lên Firebase. Lịch sử chỉ bắt đầu từ cập nhật này; localStorage có thể bị sửa/xóa nên chưa phải audit chống chỉnh sửa. Tính năng nhập lại JSON đã được bổ sung ở bước khôi phục bên dưới. Cần xác nhận quy tắc áp dụng trước khi thay đổi công thức.

Mỗi bước lưu commit riêng, cập nhật NHAT_KY_PHIEN_BAN.md và tạo Git bundle theo KHOI_PHUC_PHIEN_BAN.md.

## Tiếp bước 4 — Trạng thái kiểm tra (local)

Thêm Vắng kiểm tra, Miễn đánh giá và Cần kiểm tra bù cho từng ô TX/GK/CK trong sổ lưu trên máy. Trạng thái dùng metadata riêng, điểm tương ứng là null; điểm 0 vẫn là điểm số. Đổi điểm đã nhập sang trạng thái cần xác nhận; nhập điểm mới xóa trạng thái. Bỏ trạng thái không tự khôi phục điểm cũ. Sửa trạng thái có lịch sử và tuân thủ chốt học kỳ. Bớt cột TX xóa cả trạng thái cột đó để không xuất hiện lại khi thêm cột.

Bộ lọc Còn thiếu điểm bỏ qua ô miễn; bộ lọc Vắng/Cần kiểm tra bù theo dõi các trường hợp cần xử lý. Cả năm kiểm tra cả hai học kỳ. Excel xuất tên trạng thái; JSON giữ metadata. Giữ công thức trung bình hiện tại, bỏ qua ô không có điểm; kết quả khi thiếu bài vẫn là tạm tính. Chưa thêm lịch hẹn kiểm tra bù hoặc đánh giá môn bằng nhận xét, chưa áp dụng lên Firebase.

## Khôi phục sổ điểm từ JSON trên máy

Mở Khôi phục sổ từ JSON trong sổ lưu trên máy, chọn tệp và xem số hồ sơ khác biệt. Kiểm tra cấu trúc, điểm 0–10, số cột, mã học sinh, trạng thái/ô trống, tài khoản, lớp, môn và năm học; giới hạn 10 MB. Sổ đã thay đổi sau khi xem trước phải chọn lại tệp. Nút xác nhận tải bản hiện tại xuống rồi khôi phục bản nháp; không ghi Firebase. Lịch sử hiện có được giữ và thêm sự kiện khôi phục. Hồ sơ hiện tại không có trong tệp được giữ danh tính nhưng để trống điểm; không xóa học sinh lớp nguồn. Điểm trung bình học kỳ chưa chốt được tính lại. Học kỳ đang chốt không được đổi điểm/cột hoặc mở khóa qua tệp; cần mở lại sổ có lý do trước. Trình duyệt có thể hỏi quyền tải tệp, người dùng cần xác nhận đã nhận bản trước khôi phục.

Kiểm tra: 6 kiểm thử khôi phục/lịch sử/cache, TypeScript và build; chưa thao tác khôi phục dữ liệu thật trên trình duyệt. Chưa triển khai website.
