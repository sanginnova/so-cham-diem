# Hồ sơ triển khai — Trường Cao đẳng nghề số 1 - BQP

Ngày bắt đầu: 06/10/2026. Phạm vi: nâng cấp ứng dụng React/Vite + Firebase hiện tại cho toàn trường.

## Kết quả rà soát đầu tiên

| Hạng mục | Trạng thái và bằng chứng | Việc tiếp theo |
| --- | --- | --- |
| Website | GitHub Pages đã hoạt động; workflow 37391999779 thành công | Giữ đường dẫn hiện tại trong đợt thử nghiệm |
| Đăng nhập | Firebase Google đã chạy trên tên miền GitHub; khôi phục được sau tải lại | Kiểm thử đóng/mở trình duyệt và máy dùng chung |
| Trạng thái khởi động | Có isAuthLoading trong context nhưng App chưa dùng | Đã bổ sung màn hình chờ; cần kiểm tra trình duyệt |
| Lớp/niên khóa | Có classConfig và scopeVersion: 2; kiểm thử tách lớp và sao lưu đạt | Kiểm thử chuyển lớp bằng tài khoản thật và dữ liệu cũ |
| Chấm điểm | Có kiểm thử số lần, điểm, tuần qua tháng và nhập Excel | Đối chiếu báo cáo với 2–3 lớp thử nghiệm |
| Phân quyền | Có Firestore Rules và kiểm thử giả lập trong CI | Chạy lại bộ giả lập và nghiệm thu ma trận quyền |
| Tra cứu phụ huynh | Giao diện tìm trong students phía máy khách, có mã gợi ý; chưa có backend tra cứu riêng | Ưu tiên sửa thông báo khả dụng, thiết kế token và backend trả một hồ sơ |
| Lịch sử chỉnh sửa | Có auditService; lỗi ghi log bị bỏ qua; chưa chứng minh mọi thao tác ghi đều có audit | Rà soát độ phủ và thiết kế ghi dữ liệu/audit nhất quán |
| Hiệu năng | Bundle chính khoảng 2.15 MB trước nén ở bản build đã triển khai | Tách màn hình và thư viện Excel theo nhu cầu, đo trên điện thoại |
| Giao diện | Đã có màn hình di động và PWA | Chuẩn hóa từng thành phần; thử shadcn/ui trên một biểu mẫu trước |
| Android/iOS | Chưa có dự án Capacitor | Thực hiện sau khi bản web được nghiệm thu |

## Kiểm chứng ngày 06/10/2026

- TypeScript đạt trước thay đổi màn hình chờ.
- 16/16 kiểm thử nghiệp vụ đạt, gồm tách lớp, sao lưu, định danh đăng nhập, Excel, điểm và tuần qua tháng.
- tsx lỗi uv_os_get_passwd trong sandbox; chạy cùng bộ kiểm thử ngoài sandbox thành công.
- Build Pages và kiểm tra đăng nhập thật đã thành công trong phiên triển khai trước.
- Chưa chạy lại Firestore emulator trong lần rà soát này; không coi kết quả cũ là kết quả hiện tại.
- Chưa đo hiệu năng hoặc kiểm thử trên thiết bị Android/iOS thật.

## Đợt 1: nền tảng ổn định

1. Hoàn thiện trạng thái khởi động, lỗi tải hồ sơ và tùy chọn máy dùng chung.
2. Làm rõ tra cứu phụ huynh chưa khả dụng; không hiển thị mã thử như dữ liệu thật.
3. Chạy Firestore emulator; lập ma trận owner/admin/teacher/monitor/guest với tình huống truy cập chéo, khóa tài khoản và khóa kỳ.
4. Tách màn hình tải theo nhu cầu, đo dung lượng và thời gian tải trước/sau.
5. Chuẩn bị Firebase thử nghiệm riêng trước khi thử các thao tác sửa/xóa dữ liệu.

Nghiệm thu đợt 1: đăng nhập/khôi phục/đăng xuất rõ ràng; quyền được kiểm thử; không báo thành công khi lưu lỗi; không gây hiểu nhầm về tra cứu công khai.

## Các đợt tiếp theo

- Đợt 2: chuẩn hóa giao diện, quản trị và lịch sử chỉnh sửa.
- Đợt 3: thử nghiệm với 2–3 lớp, đối chiếu điểm, sao lưu và khôi phục.
- Đợt 4: cấp tài khoản và triển khai toàn trường sau nghiệm thu.
- Đợt 5: đóng gói Capacitor nếu cần phát hành Android/iOS.

## Thông tin cần chốt trước thử nghiệm thực tế

- Đầu mối BGH nghiệm thu và 2–3 giáo viên tham gia.
- Lớp, niên khóa và quy tắc tính điểm chính thức.
- Phạm vi dữ liệu phụ huynh được xem và cách cấp/thu hồi mã tra cứu.
- Ai thực hiện sao lưu, tần suất và thời gian lưu trữ.

Các thay đổi ban đầu được giữ trên máy để kiểm tra; không tự thay đổi dữ liệu thật để thử nghiệm.
