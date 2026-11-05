# Feature Specification: Review & Chuẩn Hóa Toàn Diện Tính Năng Trợ Lý GVCN & Xuất Sổ Chủ Nhiệm

**Feature Branch**: `001-review-tinh-nang-gvcn`  
**Created**: 2026-11-05  
**Status**: Draft  
**Target User**: Thầy Nguyễn Văn Sang - GVCN Lớp 12B4 / Khoa Cơ bản - Trường Cao đẳng Nghề số 1 - BQP  
**Input**: User description: "review lại tính năng GVCN"

---

## 1. Executive Summary & Context

Hệ thống Sổ Chấm Điểm & Nề Nếp đã phát triển bộ công cụ **Trợ lý GVCN** bao gồm:
1. Module Quản lý Hồ sơ Chủ nhiệm (`HomeroomAssistantView.tsx`): Lý lịch HS, nhật ký liên hệ phụ huynh, biên bản sinh hoạt lớp, theo dõi học sinh cần quan tâm, thu chi quỹ lớp.
2. Thời khóa biểu lớp (`HomeroomClassTimetableView.tsx`).
3. Sơ đồ chỗ ngồi & phân tổ (`SeatingChartView.tsx`).
4. Xuất Sổ Công tác GVCN (.docx) (`HomeroomBookExportModal.tsx`, `homeroomBookWordExport.ts`, `homeroomAutoFill.ts`).

**Mục tiêu của đợt review này**: Rà soát lại toàn bộ trải nghiệm người dùng (UX), tính nhất quán dữ liệu giữa Chấm điểm hàng ngày ➔ Báo cáo nề nếp ➔ Sổ Chủ Nhiệm Word, loại bỏ các thao tác trùng lặp, đảm bảo dữ liệu chạy tự động mượt mà và đúng thể thức văn bản hành chính sư phạm của Trường Cao đẳng Nghề số 1 - BQP.

---

## 2. User Scenarios & Testing *(mandatory)*

### User Story 1 - Tự Động Hóa 100% Xuất Sổ Chủ Nhiệm Chuẩn Word DOCX (Priority: P1)

Là một Giáo viên Chủ nhiệm, tôi muốn mở modal **Xuất Sổ Chủ Nhiệm (.docx)** và thấy toàn bộ các trường nội dung (giáo viên bộ môn, phân tổ, sơ đồ lớp, đặc điểm tình hình, kế hoạch năm học, chỉ tiêu, nhận xét học kỳ, hồ sơ theo dõi học sinh vi phạm, lịch họp/liên hệ phụ huynh, kế hoạch 9 tháng, nhận xét từng tuần) **đã được tự động đọc và điền sẵn chính xác từ hệ thống**, để tôi có thể tải ngay file Word hoàn chỉnh nộp TTCM Phạm Thị Thu Trang và Ban Giám hiệu mà không phải copy-paste thủ công.

**Why this priority**: Đây là sản phẩm đầu ra cốt lõi, tiết kiệm hàng giờ đồng hồ mỗi tháng cho GVCN và giải quyết trực tiếp yêu cầu báo cáo chuyên môn định kỳ.

**Independent Test**:
- Mở lớp 12B4 có sẵn nhật ký chấm điểm.
- Bấm "Số Chủ Nhiệm (.docx)".
- Chuyển sang tab "Nội dung sổ": Tất cả các ô textarea đã được điền sẵn nội dung sư phạm thực tế (không có ô nào bị bỏ trống).
- Bấm "Tải Sổ Chủ Nhiệm (.docx)": File Word sinh ra mở được trong Microsoft Word, có bảng phân tổ, sơ đồ lớp, bảng nề nếp từng tuần và chữ ký phê duyệt.

**Acceptance Scenarios**:
1. **Given** lớp có dữ liệu học sinh và nhật ký vi phạm/khen thưởng, **When** GV mở modal Xuất Sổ Chủ Nhiệm, **Then** hệ thống tự động tổng hợp danh sách vi phạm nề nếp vào mục "Theo dõi học sinh: Nội dung — Biện pháp — Kết quả".
2. **Given** GV bấm nút "⚡ Điền tự động từ báo cáo", **When** hệ thống quét xong, **Then** hiển thị thông báo thành công và lưu nháp ngay vào localStorage.
3. **Given** GV muốn làm mới toàn bộ sau khi chấm thêm điểm nề nếp mới, **When** bấm "Làm mới", **Then** hệ thống hỏi xác nhận và cập nhật lại toàn bộ số liệu nề nếp mới nhất.

---

### User Story 2 - Liên Kết Liền Mạch Giữa Chấm Nề Nếp & Hồ Sơ Theo Dõi Học Sinh (Priority: P1)

Là một GVCN, khi học sinh bị trừ điểm nhiều lần (ví dụ: nghỉ học không phép > 2 buổi, đi muộn > 3 lần), tôi muốn hệ thống tự động gắn cờ "Cần quan tâm", hiển thị gợi ý liên hệ phụ huynh và tự động đưa vào mục "Theo dõi học sinh cần quan tâm" trong Sổ chủ nhiệm.

**Why this priority**: Tránh tình trạng dữ liệu chấm điểm hàng ngày bị tách rời với hồ sơ theo dõi học sinh của GVCN; giúp GVCN can thiệp sư phạm kịp thời trước khi học sinh bị hạ bậc rèn luyện.

**Independent Test**:
- Thêm bản ghi vi phạm "Nghỉ học không phép" cho học sinh Bùi Thanh Hà (12B4-13).
- Vào tab Trợ lý GVCN hoặc Sổ Chủ Nhiệm: Học sinh Bùi Thanh Hà xuất hiện ngay trong danh sách học sinh cần quan tâm kèm biện pháp phối hợp gia đình.

**Acceptance Scenarios**:
1. **Given** một học sinh có tổng điểm trừ trong tuần/tháng vượt ngưỡng quy định (>= 5đ), **When** GV xem danh sách lớp, **Then** học sinh có huy hiệu cảnh báo vàng/đỏ.
2. **Given** học sinh có cảnh báo, **When** GV bấm vào học sinh, **Then** có nút bấm nhanh "Gọi PH" / "Soạn tin nhắn Zalo" kèm nội dung tóm tắt lỗi vi phạm.

---

### User Story 3 - Đồng Bộ Hai Chiều Sơ Đồ Chỗ Ngồi & Phân Chia Tổ Học Tập (Priority: P2)

Là một GVCN, tôi muốn việc xếp chỗ ngồi trên giao diện trực quan kéo-thả (`SeatingChartView`) tự động cập nhật số thứ tự bàn, dãy và tổ của học sinh vào danh sách lớp và xuất sang Sổ Chủ Nhiệm.

**Why this priority**: Đầu năm học GVCN thường xuyên đổi chỗ ngồi để cân bằng đối tượng học sinh (học sinh khá kèm học sinh yếu, phân bổ nam/nữ). Việc sơ đồ tự động đồng bộ sang Sổ Chủ Nhiệm giúp tài liệu Word luôn phản ánh đúng thực tế lớp học.

**Independent Test**:
- Vào màn hình "Xếp tổ & Sơ đồ lớp", hoán đổi vị trí của 2 học sinh trên sơ đồ.
- Mở modal Xuất Sổ Chủ Nhiệm: Sơ đồ lớp dạng text và bảng sơ đồ bàn học tự động phản ánh đúng vị trí mới.

**Acceptance Scenarios**:
1. **Given** sơ đồ lớp đã được xếp bàn ghế theo 4 dãy, **When** GV lưu sơ đồ, **Then** hệ thống lưu cả vào Cloud Firestore và LocalStorage.
2. **Given** khi xuất Sổ Chủ Nhiệm, **When** đọc dữ liệu sơ đồ, **Then** thể hiện rõ ràng từng bàn học: `Bàn 1: [HS A] — [HS B]`.

---

### User Story 4 - Tích Hợp Thời Khóa Biểu & Báo Giảng Của GVCN (Priority: P2)

Là một GVCN, tôi muốn Thời khóa biểu lớp chủ nhiệm hiển thị rõ môn nào do GVCN trực tiếp giảng dạy (Toán, HĐTN-HN) và môn nào do GVBM phụ trách, kèm số điện thoại liên hệ nhanh.

**Why this priority**: Giúp GVCN nắm chắc lịch học hàng ngày của lớp để kiểm tra nề nếp đầu giờ, quản lý tiết sinh hoạt lớp và liên hệ với đồng nghiệp bộ môn khi cần.

**Independent Test**:
- Vào tab "TKB Lớp", xem lịch học từ Thứ 2 đến Thứ 7.
- Hệ thống làm nổi bật các tiết của GVCN và hiển thị danh sách giáo viên bộ môn của lớp.

---

### User Story 5 - Đánh Giá & Báo Cáo Sơ Kết Thi Đua Định Kỳ (Priority: P3)

Là một GVCN, tôi muốn xem nhanh bảng tổng hợp thi đua của lớp theo từng Tuần, từng Tháng và cả Học kỳ (xếp loại Tốt, Khá, Đạt, Chưa đạt) để báo cáo Ban Giám hiệu, Khoa Cơ bản và phụ huynh trong các buổi họp.

**Acceptance Scenarios**:
1. **Given** bảng tổng kết tháng, **When** GV chọn Tháng 10 hoặc Tháng 11, **Then** hiển thị tỷ lệ xếp loại phần trăm trực quan và danh sách học sinh tiêu biểu được khen thưởng.

---

## 3. Edge Cases & Xử Lý Ngoại Lệ

1. **Lớp mới tạo chưa có học sinh hoặc chưa có nhật ký nề nếp**:
   - Hệ thống không được báo lỗi hay crash trắng màn hình.
   - Các trường trong Sổ chủ nhiệm tự động điền các nội dung khung sư phạm mẫu định hướng năm học của Bộ GD&ĐT/CĐN01, để trống phần số liệu cụ thể.
2. **Học sinh nghỉ học / chuyển lớp (`status: 'inactive'`)**:
   - Không tính vào sĩ số đang học trong các báo cáo chuyên cần tuần/tháng hiện tại.
   - Giữ nguyên lịch sử rèn luyện trong các tuần trước đó để bảo toàn tính trung thực của sổ sách.
3. **Mất kết nối mạng Internet (Offline)**:
   - Toàn bộ tính năng nhập hồ sơ GVCN, chỉnh sửa nội dung Sổ chủ nhiệm và xuất file Word `.docx` phải **hoạt động 100% offline** trên trình duyệt nhờ Local-First và client-side docx generator.
4. **Trùng lặp nội dung khi merge dữ liệu**:
   - Khi nối dữ liệu từ Cloud Firestore và ghi chép thủ công của giáo viên, hàm `join` phải khử trùng lặp thông minh (nếu nội dung thủ công đã bao hàm nội dung tự động thì không lặp lại).

---

## 4. Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (Auto-Fill Engine)**: Hệ thống PHẢI có module `homeroomAutoFill.ts` tự động đọc dữ liệu từ `students`, `disciplineLogs`, `classConfig`, `homeroomRecords`, `loadSeatingConfig` và `loadClassTimetable`.
- **FR-002 (Draft Persistence)**: Hệ thống PHẢI lưu trữ toàn bộ các ghi chép nháp của GVCN trong `localStorage` theo từng lớp (`homeroom-book:{teacherId}:{classId}`) và có nút "Lưu nội dung" trực quan.
- **FR-003 (One-Click Refresh)**: GVCN PHẢI có quyền bấm "⚡ Điền tự động từ báo cáo" (giữ nguyên ghi chép cá nhân) hoặc "Làm mới" (ghi đè đồng bộ mới nhất).
- **FR-004 (Word OpenXML Compliance)**: File Sổ Chủ Nhiệm xuất ra (.docx) PHẢI chuẩn OpenXML, có mục lục sư phạm rõ ràng, bảng biểu không bị tràn lề, hỗ trợ in ấn A4 chuẩn.
- **FR-005 (Administrative Hierarchy)**: Tiêu đề hành chính PHẢI thể hiện đúng: Bộ Quốc phòng — Trường Cao đẳng Nghề số 1 — Khoa Cơ bản — GVCN Nguyễn Văn Sang — TTCM duyệt: Phạm Thị Thu Trang.
- **FR-006 (Zero Stray Files)**: Quá trình xuất tài liệu và đồng bộ PHẢI tuyệt đối không tạo thêm file rác trên máy tính giáo viên.

---

## 5. Success Criteria *(mandatory)*

- **SC-001 (Thời gian hoàn thành)**: GVCN có thể xuất toàn bộ cuốn Sổ Công tác Chủ nhiệm cả năm học (gồm 35 tuần) chỉ trong **dưới 15 giây** sau khi mở ứng dụng.
- **SC-002 (Độ chính xác dữ liệu)**: 100% số liệu chuyên cần (nghỉ có phép, không phép, bỏ tiết) và điểm thi đua trong Sổ Word khớp hoàn toàn với bảng tổng kết trên web.
- **SC-003 (Độ ổn định)**: 0 lỗi runtime crash, 100% TypeScript compile pass (`npm run build`), hoạt động mượt mà cả trên máy tính và điện thoại (PWA).
- **SC-004 (Mức độ hài lòng của GVCN)**: Giảm 90% thời gian soạn sổ chủ nhiệm thủ công bằng giấy hoặc gõ Word truyền thống.

---

## 6. Assumptions & Context

- Hệ thống đang chạy phiên bản PWA v3.0.0 trên môi trường Node 20+, Vite, React 18.
- Lớp trọng tâm hiện tại: Lớp **12B4** (Năm học 2026-2027), GVCN: **Nguyễn Văn Sang**.
- Các quy định nề nếp bám sát Thông tư của Bộ GD&ĐT và Quy chế thi đua học sinh - sinh viên của Trường Cao đẳng Nghề số 1 - BQP.
