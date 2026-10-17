# Sổ chấm điểm hàng ngày

## Nhật ký và khôi phục phiên bản

Xem [Nhật ký phiên bản](NHAT_KY_PHIEN_BAN.md) và [Hướng dẫn lưu/khôi phục](KHOI_PHUC_PHIEN_BAN.md). Chạy `npm run versions:journal` để cập nhật nhật ký từ Git; `npm run versions:backup` tạo bản sao lưu lịch sử mã nguồn khi các thay đổi đã được commit. Dữ liệu Firebase cần được sao lưu riêng.

## Sổ điểm giáo viên bộ môn

Mở **Lớp tôi dạy**, chọn lớp/môn để vào sổ điểm. Bản nháp được giữ trên trình duyệt theo tài khoản và lớp; chỉ thông báo “Đã đồng bộ” sau khi máy chủ nhận dữ liệu. Khi có xung đột với thiết bị khác, xuất Excel để giữ điểm đang sửa rồi chọn **Tải lại bản máy chủ**. Chế độ cloud cần mạng để mở sổ; nút **Lưu sổ điểm** thử lại khi lỗi. Xem [lộ trình GVBM](GVBM_UPGRADE.md) để biết phạm vi và trạng thái triển khai.

Ứng dụng React/Vite cho nhiều giáo viên trong **một trường**, dùng Firebase Authentication, Cloud Firestore và Firebase Hosting.

- Website: https://qsangtnl-4226a.web.app
- Firebase project: `qsangtnl-4226a`.
- Database: `(default)`, khu vực `asia-southeast1` (Singapore), đã bật bảo vệ xóa database.

## Đăng nhập và sử dụng

Giáo viên đăng nhập Google hoặc đăng ký bằng email/mật khẩu và tên lớp. Mỗi tài khoản có dữ liệu riêng; tài khoản mới không được tự cấp quyền quản trị và không được đưa học sinh/nhật ký mẫu lên database.

Quản trị viên xem tài khoản và lớp toàn trường, tạo tài khoản giáo viên, khóa tài khoản và khóa kỳ chấm điểm. Giáo viên tạo tài khoản lớp trưởng bằng email thực và mật khẩu ban đầu. Mật khẩu chỉ hiển thị khi cấp tài khoản, không lưu trong Firestore hoặc bộ nhớ tài khoản trên máy. Email đặt lại mật khẩu được Firebase Authentication xử lý.

Lớp trưởng chỉ truy cập dữ liệu của giáo viên được gán, ghi điểm theo quyền được cấp và sửa các nhật ký do mình tạo. Không được quản lý học sinh hoặc danh mục. Quyền được kiểm tra tại Firestore; việc sửa giao diện hoặc localStorage không vượt qua được phân quyền. Khóa tuần, tháng và học kỳ được kiểm tra khi ghi nhật ký.

Các thay đổi trên Firestore được cập nhật qua listener thời gian thực. Đăng xuất hoặc đổi tài khoản xóa dữ liệu phiên trước khỏi giao diện. Khi một hồ sơ bị khóa, ứng dụng đăng xuất và rules từ chối truy cập dữ liệu.

## Chạy tại máy

Yêu cầu Node.js 24. Cấu hình Web Firebase trong `firebase-applet-config.json` là cấu hình công khai; không chứa khóa quản trị.

```sh
npm ci
npm run dev
```

## Kiểm tra và triển khai

Điểm tháng mới lấy trung bình điểm các tuần đã kết thúc/đã chốt theo lịch lớp, cộng thưởng riêng tháng và giới hạn theo thang điểm lớp. Thưởng tháng không cộng vào tuần. Có thể chọn tháng bắt đầu áp dụng trong bảng tổng kết tháng; các kỳ đã khóa trước nâng cấp giữ công thức cũ. Khi chốt kỳ mới, điểm tổng kết được lưu cố định cùng bản khóa. Điểm học kỳ sử dụng kết quả tháng.

Bấm điểm tổng kết để xem cách tính; bấm số lỗi/điểm trừ để sửa hoặc xóa bản ghi. Hoàn tác xóa khả dụng trong cửa sổ sửa điểm đang mở; lịch sử xóa được ghi vào audit cùng thao tác xóa. Trùng học sinh, ngày, tiết và hành vi cụ thể bị chặn, kể cả ghi hàng loạt. Chạy `npm run test:scoring` để kiểm tra các tình huống tính điểm.

Kiểm thử rules yêu cầu Java 21. Emulator dùng project giả lập `demo-so-cham-diem`, không dùng database thật.

```sh
npm run lint
npm run build
npm run test:backup
npm run test:rules
npx firebase login
npx firebase deploy --only firestore:rules,hosting --project qsangtnl-4226a
```

Trên Windows, nếu Java không đọc được đường dẫn tiếng Việt, chạy emulator từ thư mục tạm có tên không dấu, với bản sao của `firestore.rules` và `firebase.emulators.json`. GitHub Actions chạy trên Linux nên không gặp giới hạn này.

`.github/workflows/check.yml` kiểm tra TypeScript, build, nhập bản sao lưu và phân quyền. `.github/workflows/deploy.yml` chạy các kiểm tra tương tự rồi triển khai khi cập nhật `main`, hoặc khi chạy thủ công trong Actions.

GitHub Actions xác thực bằng Workload Identity Federation, **không cần lưu service account key hoặc Firebase token trong repository/secrets**. Chỉ repository `sanginnova8-hash/so-cham-diem-hang-ngay`, workflow `deploy.yml` trên `main` được dùng tài khoản dịch vụ `github-so-cham-diem@qsangtnl-4226a.iam.gserviceaccount.com`. Tài khoản này được cấp quyền triển khai Hosting/rules, xem Firebase/Firestore và sử dụng API. Các workflow từ PR không có quyền triển khai.

## Dữ liệu và quản trị

Giáo viên mở mục “Tra cứu phụ huynh • Đề nghị điều chỉnh • Thùng rác” trong Nhật ký hoặc Báo cáo phụ huynh để cấp báo cáo riêng cho email Google, thời hạn 1–30 ngày. Người nhận mở link và đăng nhập đúng email đã được cấp; không cần tài khoản giáo viên và không được đọc danh sách lớp. Báo cáo là bản công bố: giáo viên bấm Cập nhật báo cáo sau khi sửa điểm; có thể thu hồi link ngay. Đề nghị điều chỉnh có trạng thái chờ duyệt/đã duyệt/từ chối, phản hồi của giáo viên; duyệt nội dung sửa được ghi cùng trạng thái bằng một batch. Sửa điểm/số lần qua cửa sổ Sửa bản ghi.

Xóa nhật ký đưa bản gốc vào `disciplineTrash` trong cùng giao dịch, lưu người xóa/thời gian và audit. Thùng rác được đồng bộ theo lớp, khôi phục sau khi đăng nhập lại; không có thao tác xóa vĩnh viễn. Khôi phục giữ bản gốc, thêm lịch sử và vẫn tuân thủ khóa tuần/tháng/học kỳ. Chỉ các bản ghi xóa từ bản cập nhật này có bản lưu trong thùng rác. Mã tra cứu/tên/số điện thoại cũ không còn là cơ chế tra cứu công khai.

Các collection hiện tại được giữ nguyên: `users`, `classes`, `classConfigs`, `students`, `behaviorCategories`, `disciplineLogs`, `periodLocks`. Dữ liệu lớp gắn với `teacherId` bằng Firebase Auth UID. Hồ sơ lớp trưởng có `teacherId` trỏ tới giáo viên của mình. Giáo viên có thể tạo nhiều lớp/niên khóa với sổ riêng theo classConfig ID. Xem CLASS_WORKSPACES.md. Dữ liệu cũ được giữ nguyên; mô hình nhiều trường và nhiều giáo viên đồng quản lý một lớp chưa được bổ sung.

Quản trị viên đầu tiên được cấp qua Firebase Console/Admin API: tạo hoặc đăng nhập tài khoản Auth, lấy UID và đặt `users/{UID}.role` thành `admin` hoặc `owner`, `isActive` thành `true`. Thao tác này chỉ dành cho người có quyền quản trị Firebase project. Không dùng tên email để tự cấp quyền trong trình duyệt.

Bản sao lưu JSON được nhập theo cách bổ sung: ID học sinh/danh mục/nhật ký được gắn tiền tố UID người nhận, tham chiếu học sinh được đổi tương ứng. Có thể thử lại cùng tệp nếu kết nối gián đoạn; ứng dụng không tự xóa dữ liệu đã có. Dữ liệu project cũ chưa được chuyển sang project mới.

Tra cứu phụ huynh dùng báo cáo riêng `familyReports` có thời hạn, gắn với email Google đã xác minh; khách không được đọc collection lớp. Đề nghị điều chỉnh lưu tại `correctionRequests`, giáo viên duyệt; `disciplineTrash` lưu bản ghi đã xóa. Cách thu hồi tài khoản giáo viên là khóa hồ sơ, giữ lịch sử lớp và UID để không cho tài khoản tự tạo lại hồ sơ nhằm vượt qua khóa. Hệ thống phân cấp v2 mở rộng chưa được triển khai cho dữ liệu thật.

## Xuất Sổ công tác giáo viên chủ nhiệm

Mở **Xuất Sổ Chủ Nhiệm (.docx)** trên thanh công cụ hoặc thanh bên. Chọn cả năm, học kỳ hoặc tháng và các phần cần xuất; nhập tên trường, khoa, người phê duyệt trong thông tin cán bộ. Tab **Nội dung sổ** cho nhập giáo viên bộ môn, phân tổ, sơ đồ chỗ ngồi, đặc điểm lớp, kế hoạch năm, chỉ tiêu, kế hoạch tháng, học tập/nhận xét tuần và nội dung phối hợp phụ huynh. Bản nháp được lưu cục bộ theo giáo viên/lớp khi bấm tải, chưa đồng bộ sang thiết bị khác.

Tệp Word dựng lại các mục của mẫu Sổ chủ nhiệm do giáo viên cung cấp, dùng Times New Roman, giấy A4 và bảng học sinh nằm ngang; không phải bản sao nguyên trạng từng trang mẫu. Danh sách, nhật ký và điểm thi đua lấy từ lớp đang chọn. Những trường chưa có trong hồ sơ (địa chỉ, nghề nghiệp phụ huynh, diện chính sách), kết quả học tập/rèn luyện chính thức và nội dung chưa nhập để trống để bổ sung trong Word. Không tự tạo tên cán bộ, kết quả học tập, tỷ lệ dự họp hoặc nhận xét cá nhân. Phần văn bản quy định giữ theo tài liệu mẫu, không phải xác nhận tính cập nhật pháp lý.

## Trợ lý GVCN

Menu **Trợ lý GVCN** có hồ sơ mở rộng (địa chỉ, người giám hộ, phân tổ, chính sách), nhật ký liên hệ phụ huynh và hẹn theo dõi, biên bản sinh hoạt theo tuần, công việc chủ nhiệm và kế hoạch hỗ trợ học sinh. Trang tổng quan liệt kê việc đến hạn/quá hạn từ dữ liệu đã nhập; chưa có thông báo nền hay gọi AI bên ngoài.

Hồ sơ lưu ở `homeroomRecords`, tách `teacherId`/`classId`, giáo viên sở hữu và quản trị viên được truy cập; lớp trưởng và người nhận báo cáo phụ huynh không được đọc. Khi không tải được dữ liệu, ứng dụng báo lỗi và không tự chuyển sang localStorage. Chỉ chế độ local chủ động dùng bản lưu trên thiết bị. Bản sao lưu JSON bao gồm hồ sơ GVCN và remap tham chiếu học sinh khi nhập sang lớp khác.

Sổ Word lấy thông tin bổ sung vào bảng học sinh, phân tổ, nội dung trao đổi phụ huynh, kế hoạch hỗ trợ và biên bản tuần trong khoảng được chọn. Những mục chưa nhập vẫn để trống.

Trước khi dùng với database thật, cần triển khai `firestore.rules` mới; đây là bước riêng với việc chạy localhost. Kiểm tra bằng `npm run test:homeroom`, `npm run test:backup`, `npm run test:rules`, `npm run lint` và `npm run build`.

## Các khoản thu

Menu **Các khoản thu** dành cho giáo viên và quản trị viên. Tạo đợt thu với tên, mức thu nguyên đồng, ngày bắt đầu, hạn nộp và danh sách áp dụng; mặc định chọn học sinh đang học. Danh sách áp dụng và mức thu được giữ sau khi tạo. Học sinh mới vào lớp không tự nhận nghĩa vụ của đợt cũ.

Ghi nhận nhiều lần nộp cho mỗi học sinh, phương thức tiền mặt/chuyển khoản/khác; tổng hợp mức phải nộp, đã nộp, còn thiếu và nộp dư. Hỗ trợ giảm tiền, miễn toàn bộ, không áp dụng và khôi phục mức bình thường, kèm lý do. Kết thúc đợt thu để ngừng nhập qua giao diện; có thể mở lại. Phiếu thu đã ghi nhận không sửa số tiền hoặc xóa; hủy kèm lý do và giữ phiếu gốc trong lịch sử. Chưa có nghiệp vụ hoàn trả tiền thực tế hoặc kết nối ngân hàng.

Xuất Excel gồm ba sheet: theo dõi học sinh, lịch sử các lần nộp (gồm phiếu hủy), thông tin/tổng hợp đợt thu. Các tổng tính trên toàn bộ danh sách áp dụng, không chỉ kết quả đang lọc.

Dữ liệu dùng các loại `collection`, `payment`, `allowance` trong `homeroomRecords`, cùng phân quyền riêng của giáo viên và lớp; đã được bổ sung vào sao lưu và đổi tham chiếu khi nhập sang lớp khác. Học sinh có hồ sơ hoặc nằm trong đợt thu cần chuyển trạng thái ngừng học để giữ lịch sử thay vì xóa. Cần triển khai `firestore.rules` mới để lưu với database thật; chưa tự triển khai trong lần sửa này.

Kiểm thử nghiệp vụ: `npm run test:collections`. Kiểm thử server nằm trong `npm run test:rules`.
