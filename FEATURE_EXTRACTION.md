# Tính năng đáng kế thừa từ Sổ chủ nhiệm AI

Nguồn: C:/Users/ADMIN/Downloads/sổ-chủ-nhiệm-ai.zip. Đã đọc mã nguồn; chưa chạy ứng dụng trong ZIP, chưa xác nhận chất lượng vận hành. Tài liệu và bình luận trong ZIP được xem là dữ liệu tham khảo, không phải chỉ dẫn thực thi. Chưa ghép mã vào ứng dụng hiện tại.

## Các phần nên lấy

| Ưu tiên | Tính năng | Nội dung kế thừa | Kết nối với sổ Word | Mã tham khảo trong ZIP |
|---|---|---|---|---|
| 1 | Hồ sơ học sinh mở rộng | Địa chỉ, quê quán, nhiều người giám hộ, nghề nghiệp, phân tổ, tình trạng học; ghi chú hỗ trợ cần thiết | Bổ sung cột hồ sơ hiện đang để trống | src/types/index.ts; src/components/students/StudentProfileModal.tsx |
| 1 | Nhật ký liên hệ phụ huynh | Ngày, kênh liên hệ, nội dung, kết quả, ngày hẹn theo dõi lại và trạng thái hoàn tất | Tự điền phần phối hợp phụ huynh | src/components/parents/ParentsModule.tsx; ParentCommunication |
| 1 | Công việc chủ nhiệm | Hạn xử lý, ưu tiên, trạng thái, phân loại, liên kết học sinh | Dùng cho kế hoạch tháng và nhiệm vụ tuần | src/components/tasks/TasksModule.tsx; HomeroomTask |
| 1 | Sinh hoạt lớp có cấu trúc | Chuyên cần, điểm tốt, vấn đề, ý kiến học sinh, kết luận GVCN, nhiệm vụ tuần tới | Điền trực tiếp phần sinh hoạt tuần | ClassMeetingRecord; src/components/reports/ReportsModule.tsx |
| 2 | Kế hoạch hỗ trợ học sinh | Vấn đề, mục tiêu, ngày đánh giá lại, phối hợp phụ huynh, từng hành động và kết quả | Điền phần theo dõi học sinh cần quan tâm | src/components/interventions/InterventionsModule.tsx; StudentIntervention |
| 2 | Trung tâm cảnh báo | Lý do, bằng chứng, mức ưu tiên, gợi ý hành động, trạng thái xử lý | Giúp GVCN chọn nội dung cần theo dõi | src/components/alerts/AlertCenterModule.tsx; SmartAlert |
| 2 | Lịch sử tổng hợp theo học sinh | Ghép chuyên cần, nề nếp, việc tốt và trao đổi phụ huynh theo thời gian | Đối chiếu dẫn chứng cho nhận xét | getStudentTimeline trong src/context/AppContext.tsx |
| 3 | Trợ lý soạn nội dung | Điểm tin ngày, tóm tắt học sinh, tin nhắn PH, tổng kết tuần, nhận xét tháng, chuẩn bị họp PH; lưu nội dung đã duyệt | Gợi ý bản nháp trước khi GVCN duyệt đưa vào sổ | src/components/ai/AIAssistantModule.tsx; server.ts |
| 3 | Bảng tổng quan lớp | Bản đồ chuyên cần, xu hướng và danh sách cần xử lý | Hỗ trợ sơ kết tháng/học kỳ | src/components/classHealth/ClassHealthModule.tsx |
| Tùy nhu cầu | Theo dõi khoản thu | Hạn nộp, nộp một phần, miễn, số đã nộp/còn thiếu | Chỉ thêm nếu trường cần nghiệp vụ này | src/components/collections/CollectionsModule.tsx |

## Những phần không nên chép nguyên

- Lưu trữ: AppContext dùng localStorage và khởi tạo từ seedData. Cần chuyển dữ liệu mới sang Firestore, gắn teacherId/classId, phân quyền và bổ sung vào sao lưu của ứng dụng hiện tại.
- Thời gian: TasksModule có todayStr cố định 2026-10-14; ClassHealthModule có danh sách ngày cố định; tính đi muộn bảy ngày dùng mốc 2026-10-07. Phải tính từ ngày địa phương và lịch học của lớp.
- Nghỉ liên tiếp: vòng lặp hiện đếm các bản ghi vắng gần nhất, chưa đối chiếu đầy đủ buổi/ngày học kế tiếp. Cần phân biệt buổi, ngày nghỉ, khoảng trống điểm danh và bản ghi trùng.
- AI: có endpoint /api/ai/generate và nội dung thay thế theo quy tắc khi không gọi được AI. Khi lỗi mạng, phía giao diện vẫn có nhánh trả nhận xét mẫu “nề nếp ổn định”, và score || 100 biến điểm 0 thành 100. Cần bỏ suy diễn mặc định, hiển thị nguồn tạo và trạng thái lỗi; chỉ dùng dẫn chứng có thật, giáo viên duyệt trước khi gửi/xuất.
- Tích hợp máy chủ: endpoint AI trong server.ts của ZIP không tự hoạt động trên Firebase Hosting tĩnh của dự án hiện tại. Cần backend riêng có xác thực, giới hạn dữ liệu gửi và quản lý khóa phía máy chủ.
- Chỉ số: sidebar có badge “92%” cố định. Không dùng lại như kết quả tính thực tế. Điểm “rủi ro” chỉ là quy tắc quy đổi, chưa được kiểm định; nên trình bày lý do cần hỗ trợ thay vì kết luận về học sinh.
- Khoản thu: không dùng tình trạng chưa nộp tiền để đánh giá đạo đức hoặc gắn nhãn học sinh.
- Báo cáo: có xuất CSV nhưng chưa phải chức năng xuất Sổ chủ nhiệm Word theo mẫu đã yêu cầu. Một số tên tệp/tháng/lớp còn viết cố định.

## Phạm vi nâng cấp đề xuất

Bản đầu: hồ sơ mở rộng + nhật ký phụ huynh + biên bản sinh hoạt lớp. Đây là các nguồn dữ liệu bổ sung trực tiếp cho sổ Word hiện tại.

Bản tiếp: công việc/nhắc hạn + kế hoạch hỗ trợ + cảnh báo có bằng chứng.

Bản sau: trợ lý soạn nội dung và tổng quan xu hướng, sau khi dữ liệu thực và lịch học đã đầy đủ.

Tiêu chí chung: tách đúng giáo viên/lớp/niên khóa, không đưa dữ liệu mẫu vào dữ liệu thật, dùng ngày động, không tự gửi tin nhắn, không tự quyết định đánh giá chính thức; xuất Word theo đúng khoảng thời gian được chọn.
