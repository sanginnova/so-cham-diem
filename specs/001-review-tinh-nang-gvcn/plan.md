# Kế Hoạch Kỹ Thuật (Technical Plan): Review & Tối Ưu Tính Năng Trợ Lý GVCN

**Branch**: `001-review-tinh-nang-gvcn` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)  
**Tác giả**: Nguyễn Văn Sang - Khoa Cơ bản - Trường Cao đẳng Nghề số 1 - BQP

---

## 1. Tóm Tắt Kế Hoạch (Executive Summary)

Đợt nâng cấp kỹ thuật này tập trung vào việc **chuẩn hóa kiến trúc dữ liệu và tối ưu hóa hiệu năng** của toàn bộ phân hệ Trợ lý Giáo viên Chủ nhiệm (GVCN), bao gồm:
1. **Kiến trúc Component**: Tái cấu trúc và module hóa `HomeroomBookExportModal.tsx`, `HomeroomAssistantView.tsx`, `SeatingChartView.tsx` để giảm re-render, tách biệt logic nghiệp vụ khỏi UI view.
2. **State Management**: Kết nối trực tiếp giữa `AppContext` (quản lý `disciplineLogs`, `students`, `classConfig`) với bộ sinh dữ liệu tự động `homeroomAutoFill.ts` thông qua cơ chế Reactive Memoization và Auto-Debounce Cache.
3. **Data Schema & Contracts**: Chuẩn hóa interface dữ liệu `HomeroomRecord`, `HomeroomBookNotes`, `SeatingChartConfig` và đồng bộ nhất quán giữa LocalStorage và Firestore Cloud.
4. **Tối ưu hóa Word Export**: Tối ưu thư viện `docx` trong `homeroomBookWordExport.ts` để sinh văn bản Sổ Công tác GVCN đúng chuẩn thể thức văn bản Bộ Quốc phòng / GDPT 2018 (font 13pt, lề chuẩn, không nhảy trang, bảng biểu OpenXML native).

---

## 2. Bối Cảnh Kỹ Thuật (Technical Context)

- **Ngôn ngữ & Phiên bản**: TypeScript 5.5+ (Strict Mode) / React 18.3+
- **Bundler & Build Tool**: Vite 8.3 / Rolldown / PostCSS / Tailwind CSS
- **Lưu trữ dữ liệu**: 
  - Local-First: `localStorage` (cache cấu hình, bản nháp sổ, offline data).
  - Cloud Backend: Firebase Cloud Firestore (`homeroomRecords`, `disciplineLogs`, `classes`).
- **Thư viện xuất bản**: `docx` v8.5+ (OpenXML Native Word), `xlsx-js-style` (Báo cáo Excel).
- **Mục tiêu hiệu năng**:
  - Thời gian khởi tạo và điền tự động toàn bộ Sổ Chủ Nhiệm: `< 100ms`.
  - Thời gian xuất file Word cả năm học (35 tuần, ~50 trang): `< 5s`.
  - Bộ nhớ RAM tiêu thụ: `< 80MB`.
- **Ràng buộc hệ thống (Constraints)**:
  - Hoạt động 100% Offline trên PWA (Service Worker precache).
  - Không để lại bất kỳ file tạm hay file rác nào trên ổ cứng người dùng (Zero Stray Files).

---

## 3. Kiểm Tra Hiến Pháp Dự Án (Constitution Check)

| Nguyên tắc hiến pháp | Trạng thái | Đánh giá tuân thủ |
| :--- | :---: | :--- |
| **1. Zero Stray Files & Atomic Output** | **ĐẠT (PASS)** | Chỉ tạo đúng 1 file `.docx` khi bấm tải sổ, không sinh file rác trung gian. |
| **2. Chuẩn hóa Sư phạm & Toán học** | **ĐẠT (PASS)** | Bảng biểu chuẩn OpenXML, công thức toán Native OMML Cambria Math, danh xưng sư phạm chuẩn mực. |
| **3. Offline-First & Realtime Cloud** | **ĐẠT (PASS)** | Mọi dữ liệu nháp lưu ngay trong `localStorage`, đồng bộ 2 chiều Firestore khi có mạng. |
| **4. Quy trình SDD 5 bước** | **ĐẠT (PASS)** | Bám sát `spec.md` ➔ `plan.md` ➔ `tasks.md` ➔ `implement` ➔ `verify`. |
| **5. Tiết kiệm tài nguyên & YAGNI** | **ĐẠT (PASS)** | Tái sử dụng các helper có sẵn (`formatVietnameseDate`, `loadClassTimetable`, `loadSeatingConfig`), không cài thêm thư viện nặng. |

---

## 4. Kiến Trúc Hệ Thống & Cấu Trúc Mã Nguồn

```text
src/
├── components/
│   ├── HomeroomAssistantView.tsx       # Quản lý hồ sơ GVCN (Lý lịch, liên hệ, biên bản họp)
│   ├── HomeroomBookExportModal.tsx     # Modal điều khiển xuất Sổ Chủ Nhiệm Word (.docx)
│   ├── HomeroomClassTimetableView.tsx  # Thời khóa biểu & phân công GVBM
│   └── SeatingChartView.tsx            # Sơ đồ chỗ ngồi & phân chia 4 tổ học tập
├── lib/
│   ├── homeroomAutoFill.ts             # [MODULE TRỌNG TÂM] Engine tự động đọc báo cáo hệ thống
│   ├── homeroomBookWordExport.ts       # [MODULE XUẤT BẢN] Trình tạo tài liệu Word OpenXML
│   ├── seatingChart.ts                 # Xử lý ma trận chỗ ngồi và cân bằng tổ
│   ├── classTimetable.ts               # Phân tích TKB và danh sách giáo viên bộ môn
│   └── homeroom.ts                     # Kiểm định dữ liệu hồ sơ và cảnh báo hạn xử lý
├── types/
│   ├── homeroom.ts                     # Type HomeroomRecord, HomeroomInput
│   ├── seatingChart.ts                 # Type SeatingChartConfig, StudentGroupInfo
│   └── index.ts                        # Type Student, DisciplineLog, ClassConfig
└── hooks/
    └── useHomeroomRecords.ts           # Hook đồng bộ Firestore & LocalStorage
```

---

## 5. Danh Mục Các Module Cần Tối Ưu (Optimization Modules)

### Module 1: `src/lib/homeroomAutoFill.ts` (Tự Động Điền Sổ Từ Báo Cáo)
- **Hiện trạng**: Đã đọc được dữ liệu học sinh, phân tổ, vi phạm nề nếp và sơ đồ lớp.
- **Điểm tối ưu**:
  1. Phân loại mức độ vi phạm thông minh: Tự động gom các vi phạm cùng loại (ví dụ: "Nghỉ học không phép 3 lần") và gán **Biện pháp sư phạm tương ứng** (gặp riêng, trao đổi gia đình, giao bạn cùng bàn kèm cặp).
  2. Bổ sung nhận diện học sinh tiến bộ: Ghi nhận sự chuyển biến tích cực trong 2 tuần gần nhất để đưa vào cột "Kết quả".
  3. Tích hợp thời khóa biểu chuẩn xác cho các môn: Toán (GVCN Sang), Văn, Anh, Sử, Địa, Lý, Hóa, Sinh, GDKT-PL.

### Module 2: `src/lib/homeroomBookWordExport.ts` (Xuất Sổ Word DOCX)
- **Hiện trạng**: Sinh đầy đủ các phần I, II, III, IV.
- **Điểm tối ưu**:
  1. Căn lề chuẩn trang in văn bản hành chính: Lề trái 3.0cm, lề phải 1.5cm, lề trên 2.0cm, lề dưới 2.0cm.
  2. Chống xé hàng qua 2 trang (`cantSplit: true`) trên tất cả các bảng dữ liệu học sinh và bảng điểm tuần.
  3. Thiết lập lặp lại tiêu đề bảng (`tblHeader: true`) khi bảng danh sách học sinh kéo dài qua nhiều trang.
  4. Khung chữ ký chuẩn 2 cột độc lập: Duyệt của Trưởng Khoa / TTCM (Phạm Thị Thu Trang) và GVCN (Nguyễn Văn Sang).

### Module 3: `src/components/HomeroomBookExportModal.tsx` (Giao Diện Xuất Sổ)
- **Hiện trạng**: Có 4 tabs, có nút "⚡ Điền tự động từ báo cáo", "Làm mới", "Lưu nội dung".
- **Điểm tối ưu**:
  1. Thêm bộ lọc hiển thị nhanh theo từng tổ khi kiểm tra nội dung.
  2. Hiển thị badge trực quan số lượng học sinh có vi phạm đã được đồng bộ tự động.
  3. Auto-save nháp khi người dùng rời khỏi modal hoặc sau 1.5s không gõ phím (Debounced Save).

### Module 4: `src/context/AppContext.tsx` & `src/hooks/useHomeroomRecords.ts`
- **Hiện trạng**: Đồng bộ qua Firestore snapshots.
- **Điểm tối ưu**:
  1. Cache dữ liệu bằng memoization, tránh tính toán lại `getWeeklySummary` nhiều lần khi mở modal xuất sổ.
  2. Cơ chế fallback an toàn: Khi mất mạng, 100% tính năng vẫn chạy mượt mà từ LocalStorage.

---

## 6. Lộ Trình Triển Khai (Implementation Phases)

- **Phase 0 (Nghiên cứu & Thử nghiệm)**: Soát lại các trường dữ liệu và template Word trong `research.md`.
- **Phase 1 (Thiết kế chi tiết & Contracts)**: Xây dựng `data-model.md`, `contracts/` và `quickstart.md`.
- **Phase 2 (Thực thi theo Task)**: Triển khai các cải tiến thông qua lệnh `/speckit.tasks` và `/speckit.implement`.
- **Phase 3 (Kiểm thử & Bàn giao)**: Chạy `npm run build`, kiểm tra file Word đầu ra trên Microsoft Word và deploy lên Firebase.
