# Rà soát hệ thống — 02/10/2026

**Cập nhật sau rà soát:** đã bổ sung lớp/niên khóa độc lập. Xem [CLASS_WORKSPACES.md](CLASS_WORKSPACES.md). Các mục 2–3 dưới đây mô tả hạn chế của phiên bản trước; lớp mới hiện đã được tách theo classConfig ID. Dữ liệu cũ không tự chuyển đổi.

Phạm vi: mã ứng dụng, cấu hình Firebase/GitHub, kiểm thử nghiệp vụ và Firestore giả lập. Không sửa/xóa dữ liệu giáo viên đang sử dụng để thử nghiệm. Kết quả này không thay thế kiểm thử toàn bộ thao tác bằng tài khoản thật trên Android/iOS.

## Lỗi đã sửa trong lần rà soát

| Phần | Lỗi xác định được | Bản sửa |
| --- | --- | --- |
| Nhập học sinh | Bỏ qua lựa chọn `skip`, lưu lại toàn bộ danh sách; mã trùng trong cùng tệp sinh nhiều hồ sơ; lỗi lưu vẫn trả thành công | Lập kế hoạch theo mã, giữ định danh và quyền sở hữu, xử lý skip/update, chỉ ghi hồ sơ thay đổi, chia lô 400 |
| Nhập nhật ký | Hiển thị các dòng chưa lưu và bỏ qua lỗi Firebase | Chỉ cập nhật các lô đã lưu; báo lỗi rõ khi nhập dở dang, tránh thông báo thành công toàn bộ |
| Danh mục cộng/trừ | Thêm/xóa cập nhật giao diện trước khi Firebase xác nhận; lỗi lưu bị bỏ qua | Chờ Firebase trước khi cập nhật giao diện; hiển thị lỗi khi sửa danh mục/thành tích |
| Xóa học sinh | Xóa khỏi giao diện trước khi lưu; có thể xóa học sinh trong khi nhật ký bị khóa không xóa được | Kiểm tra kỳ khóa trước khi xóa kèm nhật ký, chia lô và cập nhật các phần đã được Firebase xác nhận |
| Danh sách lớp quản trị | Thao tác bất đồng bộ bị bỏ qua, báo thành công sớm; mã quản trị mặc định không phải UID Firebase | Chờ lưu/xóa, báo lỗi, dùng UID quản trị hiện tại |
| Chấm điểm | Thiếu kiểm tra số lần nguyên và điểm hữu hạn; rules không đối chiếu tổng điểm | Kiểm tra ứng dụng và rules: tổng khớp điểm × số lần trong sai số làm tròn |
| Ngày ghi nhận | Dùng ngày UTC, có thể lệch một ngày khi ghi nhận đầu ngày | Dùng ngày địa phương |
| Tổng kết học kỳ | Trung bình dùng giới hạn 0–10 cố định dù lớp có giới hạn riêng | Dùng minScore/maxScore của lớp |
| Thư viện | npm audit phát hiện xlsx cũ và gRPC | SheetJS 0.20.3 từ CDN chính thức; gRPC 1.14.5; audit thư viện production: 0 cảnh báo tại thời điểm kiểm tra |

## Kiểm chứng

- TypeScript và build production đạt.
- 9 kiểm thử nghiệp vụ đạt: định danh đăng nhập, bản sao lưu tách giáo viên, nhập học sinh skip/update và trùng mã, kiểm tra điểm/số lần, ngày địa phương, ngưỡng xếp loại và Excel đọc/ghi giữ dấu tiếng Việt/số 0 đầu.
- 8 kiểm thử Firestore giả lập đạt: khách/anonymous, truy cập chéo giáo viên, truy vấn sở hữu, nâng quyền, quản lý lớp trưởng, quyền ghi của lớp trưởng, khóa kỳ và đối chiếu tổng điểm.
- Workflow GitHub chạy các kiểm thử này trước khi triển khai.

## Giới hạn và điểm cần xử lý tiếp

1. **Tra cứu phụ huynh chưa có dịch vụ tra cứu riêng**: khách không được đọc Firestore học sinh. Trang công khai hiện không lấy dữ liệu thật; cần backend xác thực mã tra cứu và chỉ trả hồ sơ cá nhân. Không mở quyền đọc toàn bộ học sinh để làm tính năng này.
2. **Mô hình một lớp chính mỗi giáo viên**: cấu hình, danh mục và truy vấn hiện chủ yếu theo teacherId; giao diện quản trị có danh sách nhiều lớp nhưng chưa tương đương mô hình nhiều lớp độc lập/giáo viên. Cần chuyển khóa và truy vấn sang classId trước khi sử dụng theo mô hình đó.
3. **Chưa tách dữ liệu theo niên khóa**: nhật ký/tổng kết lọc theo số tháng và số tuần. Không dùng lại một bộ dữ liệu qua nhiều niên khóa mà không có quy trình lưu trữ/chuyển năm. Nhãn niên khóa mẫu và lịch tuần mẫu cần được giáo viên kiểm tra trong cấu hình lớp.
4. **Nhập nhiều lô không nguyên tử trên toàn tệp**: các lô đã lưu được giữ nếu lô sau thất bại. Nhập học sinh có thể thử lại theo mã; nhật ký cần kiểm tra trước khi nhập lại để tránh trùng.
5. **Thư viện phát triển**: npm audit toàn bộ còn 9 cảnh báo (4 moderate, 5 high) trong cây firebase-tools. Không hạ phiên bản Firebase CLI tự động theo đề xuất audit. Không có các cảnh báo này trong audit production.
6. **Hiệu năng**: bundle chính khoảng 2.13 MB chưa nén (~579 KB gzip). Nên tách các màn hình và tải thư viện Excel theo nhu cầu; chưa xác nhận tốc độ trên điện thoại thật/mạng yếu.
7. **Tài khoản tên đăng nhập**: không có email nhận thư khôi phục mật khẩu; tài khoản Google muốn dùng mật khẩu cần thiết lập mật khẩu qua email thật. Chưa kiểm thử OAuth đầy đủ trong trình duyệt kiểm tra do lỗi mạng từng gặp.
8. **Dữ liệu cũ**: rules mới từ chối bản ghi có tổng điểm không khớp hoặc số lần lẻ khi sửa. Không tự sửa lịch sử chấm điểm đã có; cần đối chiếu nếu dữ liệu cũ gặp lỗi lưu.

Nguồn cập nhật SheetJS: https://docs.sheetjs.com/docs/getting-started/installation/nodejs/
