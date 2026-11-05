# Hiến Pháp Dự Án Sổ Chấm Điểm & Nề Nếp Học Sinh (Teacher Command Center)

> **Hệ thống Quản lý Nề nếp & Trợ lý GVCN THPT / CĐN01**  
> **Chủ nhiệm & Nhà phát triển**: Nguyễn Văn Sang - Khoa Cơ bản - Trường Cao đẳng Nghề số 1 - BQP.

---

## I. Nguyên Tắc Cốt Lõi (Core Principles)

### 1. Đầu Ra Nguyên Tử & Không Để Lại File Rác (Zero Stray Files & Atomic Output)
- **Chỉ xuất bản đúng 1 file mục tiêu**: Khi có yêu cầu xuất file (Word `.docx`, Excel `.xlsx`, JSON sao lưu), CHỈ tạo và bàn giao đúng file đích. Tuyệt đối KHÔNG tự ý tạo thêm file phụ không yêu cầu.
- **Tự hủy 100% file tạm**: Mọi hình ảnh tải về, tệp JSON cache, script biên dịch trung gian BẮT BUỘC phải nằm trong thư mục tạm (`tempfile`). Sau khi hoàn tất đóng gói, thư mục tạm phải được xóa sổ hoàn toàn.
- **Cập nhật trực tiếp, chống đẻ nhánh file**: Ghi đè trực tiếp vào file mục tiêu, CẤM tạo các file biến thể song song như `_copy`, `_fix`.

### 2. Chuẩn Hóa Nghiệp Vụ Sư Phạm & Toán Học (Pedagogical Excellence)
- **Văn bản Word (.docx)**: 100% công thức Toán phải dùng Native Equation OMML (`Cambria Math`). Tuyệt đối không dùng MathType OLE cũ hay chèn ảnh công thức làm giảm chất lượng in ấn.
- **Quy chuẩn giáo dục**: Bám sát Thông tư, Điều lệ trường học, Công văn 5512, Khung Năng lực số Thông tư 02/2025/TT-BGDĐT. Báo cáo nề nếp và sổ chủ nhiệm phải đảm bảo tính pháp lý, minh bạch và sư phạm.
- **Bảo toàn dữ liệu học sinh**: Không bao giờ làm mất điểm số, lịch sử chấm thi đua hay ghi nhận vi phạm khi thay đổi danh sách học sinh hoặc chuyển tuần/tháng.

### 3. Kiến Trúc Offline-First & Real-Time Cloud Sync
- **Local-First Resilience**: Mọi thao tác chấm điểm hàng ngày, ghi nhận nề nếp phải lưu trữ tức thì vào `localStorage`, đảm bảo giáo viên sử dụng mượt mà ngay cả khi mất kết nối mạng.
- **Cloud Firestore Synchronization**: Tự động đồng bộ hai chiều an toàn khi có mạng (phân quyền nghiêm ngặt giữa `teacher`, `admin`, `monitor`).
- **PWA Ready**: Hỗ trợ Service Worker, cài đặt trực tiếp lên điện thoại/máy tính bảng như Native App.

### 4. Quy Trình Phát Triển Định Hướng Đặc Tả (Specification-Driven Development - SDD)
Mọi tính năng mới hoặc nâng cấp lớn phải tuân thủ nghiêm ngặt chu trình:
1. **Spec (`/speckit.specify`)**: Đặc tả mục tiêu người dùng, kịch bản nghiệp vụ sư phạm, input/output, và trường hợp biên (edge cases). Không viết code khi chưa thống nhất Spec.
2. **Plan (`/speckit.plan`)**: Thiết kế kỹ thuật, kiến trúc component, schema dữ liệu, state management.
3. **Tasks (`/speckit.tasks`)**: Chia nhỏ thành các bước thực thi nguyên tử, có thứ tự phụ thuộc rõ ràng.
4. **Implement (`/speckit.implement`)**: Viết code tuần tự theo Task, đối chiếu liên tục với Spec.
5. **Verify (`npm run build`)**: Biên dịch TypeScript 0 lỗi trước khi bàn giao và deploy Firebase.

### 5. Tiết Kiệm Tài Nguyên & Tinh Gọn (YAGNI & Token Efficiency)
- Code rõ ràng, tường minh, tái sử dụng các components và hooks hiện có trong `src/context/`, `src/lib/`, `src/hooks/`.
- Phản hồi trực diện, súc tích, ưu tiên giải pháp kỹ thuật triệt để.

---

## II. Ngăn Xếp Công Nghệ Chuẩn (Tech Stack)

| Hạng mục | Công nghệ sử dụng | Quy định ràng buộc |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18, TypeScript, Vite | Strict TypeScript, Zero Type Errors |
| **UI & Styling** | Tailwind CSS, Lucide React | Giao diện hiện đại, Dark/Light Mode, Responsive Mobile/Desktop |
| **Backend & CSDL** | Firebase Cloud Firestore, Firebase Auth, Firebase Hosting | Quy tắc bảo mật Firestore Rules, phân quyền vai trò người dùng |
| **Xuất Bản Tài Liệu** | `docx` (OpenXML), `xlsx-js-style` | Native Word Tables, Cambria Math OMML, Excel Header chuyên nghiệp |
| **PWA & Offline** | Vite PWA Plugin, Workbox | Precache assets, offline fallback |
| **Quản Lý Quy Chuẩn** | GitHub Spec Kit (Specify CLI) | Lưu trữ tại `.specify/`, spec tại `.specify/specs/` |

---

## III. Cơ Chế Thẩm Quyền & Sửa Đổi (Governance)

- Mọi bổ sung, sửa đổi Hiến pháp dự án này phải được sự đồng thuận của Chủ nhiệm đề tài: **Thầy Nguyễn Văn Sang**.
- Các pull request hoặc code do AI đề xuất vi phạm 5 nguyên tắc cốt lõi trên sẽ bị từ chối và yêu cầu tái cấu trúc.

**Phiên bản**: 1.0.0 | **Ngày ban hành**: 05/11/2026 | **Đơn vị**: Khoa Cơ bản - Trường Cao đẳng Nghề số 1 - BQP
