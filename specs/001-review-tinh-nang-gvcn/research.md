# Nghiên Cứu Kỹ Thuật (Phase 0 Research): Trợ Lý GVCN & Xuất Sổ Chủ Nhiệm

**Feature**: `001-review-tinh-nang-gvcn` | **Date**: 2026-11-05

---

## 1. Nghiên Cứu Yêu Cầu Pháp Lý & Thể Thức Sổ Chủ Nhiệm

### Vấn đề:
Sổ công tác Giáo viên Chủ nhiệm tại các trường THPT và trường Cao đẳng Nghề (đặc biệt là khối quân đội CĐN01 - BQP) có những quy định nghiêm ngặt về thể thức:
- **Khổ giấy & Căn lề**: A4 Portrait. Lề trái 30mm (để đóng gáy sổ), lề phải 15mm, lề trên 20mm, lề dưới 20mm.
- **Font chữ chuẩn**: Times New Roman hoặc Cambria (cỡ chữ 12-13pt).
- **Cơ cấu tổ chức**: Bắt buộc có Ban cán sự (Lớp trưởng, phó học tập, phó nề nếp, bí thư) và danh sách 4 tổ học tập.
- **Hồ sơ theo dõi**: Yêu cầu 3 cột bắt buộc: *Nội dung cần theo dõi* — *Biện pháp giáo dục* — *Kết quả*.
- **Phê duyệt**: Trang cuối bắt buộc có 2 cột chữ ký: Trưởng khoa/TTCM và Giáo viên chủ nhiệm.

### Giải pháp kỹ thuật trong thư viện `docx`:
```typescript
new Paragraph({
  children: [
    new TextRun({
      text: "THEO DÕI HỌC SINH CẦN QUAN TÂM",
      bold: true,
      font: "Times New Roman",
      size: 26, // 13pt
    })
  ]
})
```
- Sử dụng `cantSplit: true` cho từng TableRow để chống hiện tượng 1 hàng dữ liệu học sinh bị cắt đôi qua 2 trang.
- Sử dụng `tableHeader: true` cho hàng tiêu đề của bảng danh sách học sinh để tự động lặp lại khi bảng dài qua trang sau.

---

## 2. Nghiên Cứu Cơ Chế Tự Động Phân Tích Dữ Liệu Nề Nếp (`homeroomAutoFill`)

### Vấn đề:
Làm thế nào để chuyển đổi từ hàng trăm bản ghi chấm điểm rời rạc (`DisciplineLog[]`) thành văn phong nhận xét sư phạm cô đọng, có cấu trúc?

### Thuật toán giải quyết:
1. **Lọc và Gom nhóm**:
   - Lọc các bản ghi `type === 'deduct'` theo từng `studentId`.
   - Tính tổng điểm trừ lũy kế của từng học sinh.
   - Trích xuất danh sách các hành vi vi phạm khác nhau (ví dụ: "Nghỉ học có phép", "Đi muộn", "Quên sách vở") kèm tần suất xuất hiện.
2. **Khớp Biện Pháp Sư Phạm (Remedy Mapping)**:
   - Nếu vi phạm chuyên cần (nghỉ học, đi muộn): ➔ Biện pháp: *Liên hệ gia đình đôn đốc giờ giấc, yêu cầu cam kết đi học chuyên cần.*
   - Nếu vi phạm học tập (quên bài, không thuộc bài): ➔ Biện pháp: *Phân công cán sự lớp kiểm tra 15 phút đầu giờ, GVCN kiểm tra đột xuất.*
   - Nếu vi phạm kỷ luật (điện thoại, nói chuyện): ➔ Biện pháp: *Nhắc nhở trước lớp, yêu cầu viết bản tự kiểm điểm.*
3. **Đánh giá Kết quả (Progress Evaluation)**:
   - Nếu trong 2 tuần gần nhất học sinh không bị trừ thêm điểm nào: ➔ Kết quả: *Học sinh có chuyển biến rõ rệt, nề nếp tiến bộ, đi học đúng giờ.*

---

## 3. Nghiên Cứu Kiến Trúc Lưu Trữ & Đồng Bộ Nháp (Draft Cache Architecture)

### Vấn đề:
Giáo viên có thể đang gõ dở kế hoạch tháng hoặc nhận xét tuần thì bị mất mạng, tắt tab hoặc chuyển sang chấm điểm học sinh khác.

### Giải pháp:
- **Key cô lập theo giáo viên và lớp**: `homeroom-book:${teacherId}:${classId}`.
- **Cơ chế Debounce Auto-Save**: Tự động lưu vào `localStorage` sau 1000ms khi giáo viên dừng gõ phím.
- **Cơ chế Nạp an toàn**: Khi mở modal, ưu tiên đọc bản nháp đã lưu; nếu bản nháp trống thì tự động nạp từ bộ phân tích `generateAutoHomeroomNotes`.

