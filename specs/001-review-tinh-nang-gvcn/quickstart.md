# Hướng Dẫn Kiểm Thử Nhanh (Phase 1 Quickstart): Tính Năng GVCN

**Feature**: `001-review-tinh-nang-gvcn` | **Date**: 2026-11-05

---

## 1. Môi Trường & Điều Kiện Tiên Quyết
- Ứng dụng đang chạy ở chế độ dev (`npm run dev`) hoặc online tại: `https://qsangtnl-4226a.web.app`
- Tài khoản đăng nhập: Vai trò **GVCN** (`role: 'teacher'`).
- Lớp học chọn kiểm thử: **Lớp 12B4 (Năm học 2026-2027)**.

---

## 2. Kịch Bản Kiểm Thử 1: Tự Động Điền & Xuất Sổ Chủ Nhiệm

1. Từ menu bên trái, bấm vào nút màu đỏ: **"Sổ Chủ Nhiệm (.docx) - Theo mẫu sổ GVCN"**.
2. Modal mở lên, bấm vào Tab thứ 4: **"Nội dung sổ"**.
3. **Quan sát kết quả mong đợi**:
   - Thanh công cụ trên cùng hiển thị: `Đã phân tích: 40 học sinh, XX bản ghi nề nếp & vi phạm, sơ đồ chỗ ngồi và 4 tổ`.
   - Mục *Giáo viên bộ môn*: Đã có danh sách GV dạy Toán, Văn, Sử, Địa, Lý, Hóa, Sinh...
   - Mục *Phân tổ*: Đã có Ban cán sự và danh sách 4 tổ học tập.
   - Mục *Theo dõi học sinh*: Đã tự động liệt kê các học sinh có điểm trừ (kèm nội dung, biện pháp, kết quả).
   - Mục *Phối hợp phụ huynh*: Đã có lịch họp đầu năm, sơ kết và các ngày liên hệ.
4. Bấm nút màu đỏ: **"Tải Sổ Chủ Nhiệm (.docx)"**.
5. Mở file Word vừa tải về:
   - File mở được bình thường trong Microsoft Word (không có thông báo lỗi file hỏng).
   - Trang bìa có Quốc hiệu, Trường Cao đẳng Nghề số 1, Lớp 12B4, GVCN Nguyễn Văn Sang.
   - Danh sách học sinh và bảng điểm các tuần không bị tràn lề hay xé dòng.

---

## 3. Kịch Bản Kiểm Thử 2: Chỉnh Sửa & Lưu Bản Nháp (Draft Cache)

1. Trong tab "Nội dung sổ", sửa đổi một câu bất kỳ trong ô textarea (ví dụ thêm ghi chú cá nhân vào Kế hoạch Tháng 11).
2. Bấm nút **"Lưu"** hoặc **"Lưu nội dung"**.
3. Đóng modal và mở lại:
   - Nội dung vừa chỉnh sửa vẫn còn nguyên vẹn 100%.
4. Bấm nút **"⚡ Điền tự động từ báo cáo"**:
   - Hệ thống điền các mục còn thiếu mà không xóa mất câu Thầy đã sửa.
5. Bấm nút **"Làm mới"** (và đồng ý xác nhận):
   - Hệ thống quét lại dữ liệu mới nhất từ nhật ký chấm điểm.
