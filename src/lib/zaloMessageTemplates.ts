import { Student, DisciplineLog, ClassConfig, StudentWeeklySummary, StudentMonthlySummary } from '../types';
import { formatVietnameseDate, formatVietnameseNumber, compareVietnameseNames } from './utils';

export type TemplateTarget = 'class_group' | 'individual_parent';
export type TemplatePeriod = 'week' | 'month' | 'semester' | 'custom';
export type TemplateCategory = 'weekly' | 'monthly' | 'discipline' | 'honors' | 'notice' | 'individual' | 'custom';

export interface TemplateOptions {
  includeStats: boolean;
  includeHonors: boolean;
  includeViolations: boolean;
  maskViolationNames: boolean; // Nếu true: chỉ hiển thị Mã HS hoặc tên viết tắt để bảo vệ sự riêng tư
  includeTeacherContact: boolean;
  includeNextWeekPlan: boolean;
  includeMiniScoreTable: boolean;
  customNextWeekPlan?: string;
  customTeacherNote?: string;
}

export interface ZaloMessageTemplate {
  id: string;
  title: string;
  description: string;
  target: TemplateTarget;
  period: TemplatePeriod;
  category: TemplateCategory;
  contentTemplate: string;
  defaultOptions: TemplateOptions;
  isCustom?: boolean;
}

export interface SmartTagInfo {
  tag: string;
  label: string;
  description: string;
  category: 'general' | 'stats' | 'lists' | 'student';
}

export const SMART_TAGS: SmartTagInfo[] = [
  // Thông tin chung
  { tag: '{ten_lop}', label: 'Tên lớp', description: 'Ví dụ: 10A8, Điện CN K45', category: 'general' },
  { tag: '{gvcn}', label: 'GVCN', description: 'Họ tên giáo viên chủ nhiệm (vd: Nguyễn Văn Sang)', category: 'general' },
  { tag: '{khoa}', label: 'Khoa / Tổ', description: 'Khoa chuyên môn (vd: Khoa Cơ bản)', category: 'general' },
  { tag: '{sdt_gv}', label: 'SĐT GVCN', description: 'Số điện thoại của giáo viên', category: 'general' },
  { tag: '{ten_truong}', label: 'Tên trường', description: 'Trường Cao đẳng nghề số 1 - BQP hoặc đơn vị', category: 'general' },
  { tag: '{nien_khoa}', label: 'Niên khóa', description: 'Ví dụ: 2025 - 2026', category: 'general' },
  { tag: '{tuan}', label: 'Số tuần', description: 'Tuần học hiện tại (vd: Tuần 3)', category: 'general' },
  { tag: '{thang}', label: 'Tháng', description: 'Tháng đánh giá (vd: Tháng 9)', category: 'general' },
  { tag: '{ky_danh_gia}', label: 'Kỳ đánh giá', description: 'Tuần X hoặc Tháng Y', category: 'general' },
  { tag: '{tieu_de_ky}', label: 'Tiêu đề kỳ', description: 'Tuần X (Tháng Y) hoặc Tháng Y', category: 'general' },
  { tag: '{diem_nen}', label: 'Điểm nền chuẩn', description: 'Điểm khởi đầu mặc định (vd: 10đ)', category: 'general' },
  { tag: '{ngay_thang}', label: 'Ngày gửi tin', description: 'Ngày tháng hiện tại', category: 'general' },

  // Số liệu tổng hợp cả lớp
  { tag: '{si_so}', label: 'Sĩ số', description: 'Tổng số học sinh trong lớp', category: 'stats' },
  { tag: '{diem_tb_lop}', label: 'Điểm TB lớp', description: 'Điểm rèn luyện trung bình chuẩn xác', category: 'stats' },
  { tag: '{so_xuat_sac}', label: 'Số Xuất sắc', description: 'Số học sinh xếp loại Xuất sắc', category: 'stats' },
  { tag: '{ti_le_xuat_sac}', label: 'Tỉ lệ Xuất sắc (%)', description: 'Tỉ lệ % học sinh đạt Xuất sắc', category: 'stats' },
  { tag: '{so_tot}', label: 'Số Tốt', description: 'Số học sinh xếp loại Tốt', category: 'stats' },
  { tag: '{so_tot_xuat_sac}', label: 'Tốt & Xuất sắc', description: 'Tổng học sinh Tốt + Xuất sắc', category: 'stats' },
  { tag: '{so_kha}', label: 'Số Khá', description: 'Số học sinh xếp loại Khá', category: 'stats' },
  { tag: '{so_trung_binh}', label: 'Số Trung bình', description: 'Số học sinh Trung bình', category: 'stats' },
  { tag: '{so_yeu}', label: 'Số Yếu', description: 'Số học sinh Yếu', category: 'stats' },
  { tag: '{ti_le_tot}', label: 'Tỉ lệ rèn luyện tốt (%)', description: 'Tỉ lệ % học sinh rèn luyện tốt', category: 'stats' },
  { tag: '{so_khong_vi_pham}', label: 'Số HS không vi phạm', description: 'Học sinh đạt chuẩn 100% không bị trừ điểm', category: 'stats' },
  { tag: '{ti_le_khong_vi_pham}', label: 'Tỉ lệ không vi phạm (%)', description: 'Tỉ lệ % học sinh 100% nề nếp chuẩn', category: 'stats' },
  { tag: '{tong_luot_loi}', label: 'Tổng lượt vi phạm', description: 'Tổng số lượt vi phạm trong kỳ', category: 'stats' },
  { tag: '{tong_diem_tru}', label: 'Tổng điểm trừ lớp', description: 'Tổng số điểm bị trừ của cả lớp', category: 'stats' },
  { tag: '{tong_diem_cong}', label: 'Tổng điểm cộng lớp', description: 'Tổng điểm biểu dương thi đua cả lớp', category: 'stats' },

  // Khối danh sách tự sinh
  { tag: '{danh_sach_khen_thuong}', label: 'Danh sách khen thưởng', description: 'Tuyên dương học sinh điểm cao & việc tốt', category: 'lists' },
  { tag: '{danh_sach_nhac_nho}', label: 'Danh sách cần nhắc nhở', description: 'Học sinh vi phạm nề nếp cần phối hợp', category: 'lists' },
  { tag: '{bang_diem_top_10}', label: 'Bảng Top 10 điểm cao', description: '10 học sinh xuất sắc nhất', category: 'lists' },
  { tag: '{bang_diem_rut_gon}', label: 'Bảng điểm tóm tắt', description: 'Danh sách cả lớp dạng rút gọn', category: 'lists' },
  { tag: '{ke_hoach_tuan_toi}', label: 'Kế hoạch tuần tới', description: 'Dặn dò nhiệm vụ & nề nếp trọng tâm', category: 'lists' },

  // Thẻ cá nhân học sinh (chế độ gửi riêng)
  { tag: '{ho_ten_hs}', label: 'Họ tên HS', description: 'Tên học sinh được gửi', category: 'student' },
  { tag: '{ma_hs}', label: 'Mã HS', description: 'Mã định danh học sinh', category: 'student' },
  { tag: '{diem_hs}', label: 'Điểm rèn luyện', description: 'Điểm tổng kết của học sinh (vd: 10 hoặc 9,5)', category: 'student' },
  { tag: '{xep_loai_hs}', label: 'Xếp loại HS', description: 'Xuất sắc / Tốt / Khá / Đạt / Không đạt', category: 'student' },
  { tag: '{xep_hang_hs}', label: 'Thứ hạng HS', description: 'Vị trí thi đua của HS trong lớp (vd: Hạng 1/35)', category: 'student' },
  { tag: '{tong_diem_tru_hs}', label: 'Điểm trừ của HS', description: 'Tổng số điểm bị trừ nề nếp của HS', category: 'student' },
  { tag: '{tong_diem_cong_hs}', label: 'Điểm thưởng của HS', description: 'Tổng số điểm cộng khen thưởng của HS', category: 'student' },
  { tag: '{so_loi_hs}', label: 'Số lỗi của HS', description: 'Số lượt ghi nhận vi phạm của học sinh', category: 'student' },
  { tag: '{so_khen_thuong_hs}', label: 'Số khen thưởng HS', description: 'Số lần nhận điểm cộng của học sinh', category: 'student' },
  { tag: '{chi_tiet_loi}', label: 'Chi tiết vi phạm', description: 'Ngày vi phạm & nội dung lỗi của HS', category: 'student' },
  { tag: '{chi_tiet_khen_thuong}', label: 'Chi tiết khen thưởng', description: 'Điểm cộng & thành tích việc tốt', category: 'student' },
  { tag: '{loi_nhan_gv}', label: 'Lời dặn dò từ GV', description: 'Động viên, nhắc nhở riêng của GVCN', category: 'student' },
  { tag: '{sdt_phu_huynh}', label: 'SĐT Phụ huynh', description: 'Số điện thoại của gia đình', category: 'student' },
  { tag: '{ma_tra_cuu}', label: 'Mã tra cứu phụ huynh', description: 'Mã token bí mật để phụ huynh tự tra cứu', category: 'student' },
  { tag: '{link_tra_cuu}', label: 'Link tra cứu 1-chạm', description: 'Đường dẫn tra cứu kết quả rèn luyện trực tuyến', category: 'student' },
];

export const DEFAULT_ZALO_TEMPLATES: ZaloMessageTemplate[] = [
  // 1. Mẫu Tuần - Gửi Nhóm Zalo Lớp
  {
    id: 'weekly_class_group',
    title: 'Báo cáo nề nếp & điểm thi đua Tuần (Gửi nhóm Zalo lớp)',
    description: 'Báo cáo tuần toàn diện, văn phong sư phạm chuẩn mực: số liệu điểm trung bình, tuyên dương việc tốt, nhắc nhở nề nếp và kế hoạch tuần mới.',
    target: 'class_group',
    period: 'week',
    category: 'weekly',
    defaultOptions: {
      includeStats: true,
      includeHonors: true,
      includeViolations: true,
      maskViolationNames: false,
      includeTeacherContact: true,
      includeNextWeekPlan: true,
      includeMiniScoreTable: false,
      customNextWeekPlan: 'Nhiệm vụ tuần tới: Toàn lớp chấp hành nghiêm chỉnh đồng phục, mang phù hiệu, tác phong đúng quy định; đi học đúng giờ; bảo quản tốt trang thiết bị xưởng thực hành và phòng học; tích cực xung kích trong các hoạt động phong trào.',
    },
    contentTemplate: `📊 BÁO CÁO NỀ NẾP & THI ĐUA TUẦN {tuan} (THÁNG {thang})
🏫 Lớp: {ten_lop} • Trường: {ten_truong}
📅 Thời gian gửi: {ngay_thang}
═══════════════════════════════

Kính gửi Quý Phụ huynh lớp {ten_lop},
Thầy/Cô {gvcn} xin trân trọng thông báo tổng kết tình hình học tập và rèn luyện nề nếp của các em học sinh trong Tuần {tuan} vừa qua:

📈 1. SỐ LIỆU TỔNG QUAN NỀ NẾP LỚP:
• Sĩ số: {si_so} học sinh
• Điểm rèn luyện trung bình: {diem_tb_lop} điểm (Thang chuẩn: {diem_nen}đ)
• Đạt loại Tốt & Xuất sắc: {so_tot_xuat_sac} em ({ti_le_tot}%)
• Học sinh rèn luyện Xuất sắc: {so_xuat_sac} em ({ti_le_xuat_sac}%)
• Học sinh rèn luyện Tốt: {so_tot} em
• Học sinh cần cố gắng: {so_trung_binh} em Trung bình/Đạt, {so_yeu} em Cần cố gắng
• Học sinh giữ vững chuẩn 100% không vi phạm: {so_khong_vi_pham} em ({ti_le_khong_vi_pham}%)
• Tổng điểm thưởng thi đua: +{tong_diem_cong}đ
• Tổng điểm trừ nề nếp: -{tong_diem_tru}đ ({tong_luot_loi} lượt vi phạm)

🌟 2. DANH SÁCH BIỂU DƯƠNG - KHEN THƯỞNG:
{danh_sach_khen_thuong}

⚠️ 3. DANH SÁCH CẦN LƯU Ý & PHỐI HỢP ĐÔN ĐỐC:
{danh_sach_nhac_nho}

📌 4. KẾ HOẠCH & DẶN DÒ TRỌNG TÂM TUẦN TỚI:
{ke_hoach_tuan_toi}

Kính mong Quý Phụ huynh tiếp tục đồng hành cùng Nhà trường, thường xuyên nhắc nhở các em duy trì ý thức tự giác, chấp hành tốt nội quy trường lớp và quy định an toàn giao thông.

Kính chúc Quý Phụ huynh cùng các em một tuần mới mạnh khỏe, an vui và học tập hiệu quả!

Trân trọng,
👨‍🏫 GVCN: {gvcn} • Lớp {ten_lop}
📞 Hotline liên hệ: {sdt_gv}`,
  },

  // 2. Mẫu Tháng - Gửi Nhóm Zalo Lớp
  {
    id: 'monthly_class_group',
    title: 'Tổng kết điểm rèn luyện & xếp loại Tháng (Gửi nhóm Zalo)',
    description: 'Báo cáo tổng kết tháng toàn diện kèm kết quả phân loại thi đua, biểu dương cá nhân tiêu biểu và định hướng tháng tiếp theo.',
    target: 'class_group',
    period: 'month',
    category: 'monthly',
    defaultOptions: {
      includeStats: true,
      includeHonors: true,
      includeViolations: true,
      maskViolationNames: false,
      includeTeacherContact: true,
      includeNextWeekPlan: true,
      includeMiniScoreTable: true,
      customNextWeekPlan: 'Nhiệm vụ tháng mới: Tiếp tục đẩy mạnh phong trào thi đua dạy tốt - học tốt; tăng cường rèn luyện kỷ luật, chấp hành tuyệt đối an toàn giao thông và quy chế nhà trường.',
    },
    contentTemplate: `🏆 BÁO CÁO TỔNG KẾT RÈN LUYỆN THÁNG {thang}
🏫 Lớp {ten_lop} • Năm học {nien_khoa}
Trường: {ten_truong}
═══════════════════════════════

Kính gửi Quý Phụ huynh lớp {ten_lop},
Thầy/Cô {gvcn} xin thông báo kết quả đánh giá điểm rèn luyện và xếp loại thi đua tháng {thang} của tập thể lớp như sau:

📊 1. KẾT QUẢ PHÂN LOẠI THI ĐUA TOÀN DIỆN:
• Tổng số học sinh: {si_so} em
• Điểm rèn luyện trung bình tháng: {diem_tb_lop} điểm
• Đạt loại Tốt & Xuất sắc: {so_tot_xuat_sac} em ({ti_le_tot}%)
  - Xuất sắc: {so_xuat_sac} em ({ti_le_xuat_sac}%)
  - Tốt: {so_tot} em
  - Khá: {so_kha} em
  - Trung bình / Đạt: {so_trung_binh} em
  - Cần rèn luyện thêm: {so_yeu} em
• Tổng điểm thưởng tháng: +{tong_diem_cong}đ | Tổng điểm trừ: -{tong_diem_tru}đ

🌟 2. VINH DANH HỌC SINH TIÊU BIỂU THÁNG {thang}:
{danh_sach_khen_thuong}

⚠️ 3. MỘT SỐ NỘI DUNG NỀ NẾP CẦN GIA ĐÌNH CÙNG LƯU TÂM:
{danh_sach_nhac_nho}

🚀 4. ĐỊNH HƯỚNG & NHIỆM VỤ THÁNG TIẾP THEO:
{ke_hoach_tuan_toi}

Chân thành cảm ơn sự phối hợp nhiệt tình, trách nhiệm và đầy tâm huyết của Quý Phụ huynh trong suốt tháng qua để xây dựng tập thể lớp ngày một vững mạnh!

Trân trọng thông báo,
👨‍🏫 GVCN: {gvcn} • Lớp {ten_lop}
📞 SĐT liên hệ: {sdt_gv}`,
  },

  // 3. Mẫu Trường Nghề & Kỷ Luật Quân Sự (CĐ Nghề 01 - BQP)
  {
    id: 'vocational_discipline_military',
    title: 'Đôn đốc kỷ luật, tác phong xưởng nghề & chuyên cần (CĐ Nghề 01 - BQP)',
    description: 'Nhấn mạnh nề nếp quân đội, an toàn vệ sinh lao động thực hành xưởng, tác phong giờ giấc và tính kỷ luật trường nghề.',
    target: 'class_group',
    period: 'week',
    category: 'discipline',
    defaultOptions: {
      includeStats: true,
      includeHonors: true,
      includeViolations: true,
      maskViolationNames: false,
      includeTeacherContact: true,
      includeNextWeekPlan: true,
      includeMiniScoreTable: false,
      customNextWeekPlan: 'Yêu cầu 100% học viên: 1. Có mặt tại giảng đường/xưởng thực hành trước 15 phút để chuẩn bị nề nếp; 2. Mang đầy đủ trang phục bảo hộ lao động theo đúng chuyên ngành; 3. Thực hiện nghiêm túc chế độ bảo quản, bàn giao trang thiết bị kỹ thuật; 4. Nghiêm cấm hút thuốc lá, sử dụng điện thoại sai quy định.',
    },
    contentTemplate: `🎖️ THÔNG BÁO QUẢN LÝ NỀ NẾP & KỶ LUẬT QUÂN SỰ - CHUYÊN MÔN
🏫 Lớp: {ten_lop} • {ten_truong}
Tuần huấn luyện & học tập số: {tuan} (Tháng {thang})
═══════════════════════════════

Kính gửi Quý Phụ huynh và các đồng chí học viên lớp {ten_lop},
Nhằm duy trì nghiêm kỷ luật quân đội và an toàn tuyệt đối trong thực hành nghề, Ban chủ nhiệm lớp xin thông báo tình hình rèn luyện nề nếp Tuần {tuan}:

⚙️ 1. TÌNH HÌNH NỀ NẾP & QUÂN SỐ CHUYÊN CẦN:
• Quân số lớp: {si_so} học viên
• Điểm rèn luyện bình quân: {diem_tb_lop} điểm
• Tỉ lệ học viên rèn luyện Tốt & Xuất sắc: {so_tot_xuat_sac} đồng chí ({ti_le_tot}%)
• Số đồng chí chấp hành 100% chuẩn nề nếp: {so_khong_vi_pham} đồng chí ({ti_le_khong_vi_pham}%)
• Số lượt nhắc nhở về tác phong/giờ giấc/nội vụ: {tong_luot_loi} lượt

⭐ 2. BIỂU DƯƠNG HỌC VIÊN CÓ Ý THỨC NỀ NẾP CAO:
{danh_sach_khen_thuong}

⚠️ 3. CÁC TRƯỜNG HỢP CẦN CHẤN CHỈNH KỶ LUẬT & NỘI VỤ:
{danh_sach_nhac_nho}

🛡️ 4. QUY ĐỊNH TRỌNG TÂM TUẦN TIẾP THEO:
{ke_hoach_tuan_toi}

Đề nghị Quý gia đình nắm bắt, phối hợp chặt chẽ cùng Nhà trường quản lý giờ giấc, động viên các em rèn luyện bản lĩnh, tác phong nghiêm túc của "Người lính - Người thợ tay nghề cao"!

Chỉ huy / GVCN: {gvcn}
📞 Điện thoại liên hệ: {sdt_gv}`,
  },

  // 4. Mẫu Bảng Vàng Vinh Danh - Top Học Sinh Tiêu Biểu
  {
    id: 'honors_top_students',
    title: 'Bảng vàng vinh danh Top học sinh rèn luyện tiêu biểu',
    description: 'Mẫu tin nhắn chúc mừng, vinh danh các cá nhân có điểm rèn luyện xuất sắc nhất tuần hoặc tháng, tạo động lực thi đua.',
    target: 'class_group',
    period: 'week',
    category: 'honors',
    defaultOptions: {
      includeStats: true,
      includeHonors: true,
      includeViolations: false,
      maskViolationNames: false,
      includeTeacherContact: true,
      includeNextWeekPlan: false,
      includeMiniScoreTable: false,
    },
    contentTemplate: `🏆 BẢNG VÀNG TUYÊN DƯƠNG HỌC SINH TIÊU BIỂU TUẦN {tuan}
🏫 Lớp {ten_lop} • {ten_truong}
═══════════════════════════════

Thầy/Cô chủ nhiệm trân trọng chúc mừng và vinh danh các em học sinh có thành tích rèn luyện đạo đức, tác phong và ý thức thi đua xuất sắc nhất trong Tuần {tuan} vừa qua:

🥇 DANH SÁCH TOP HỌC SINH ĐIỂM RÈN LUYỆN CAO NHẤT:
{bang_diem_top_10}

🌟 BIỂU DƯƠNG CÁC VIỆC TỐT & TINH THẦN TỰ GIÁC TIÊU BIỂU:
{danh_sach_khen_thuong}

Thầy/Cô và tập thể lớp nhiệt liệt biểu dương tinh thần phấn đấu, gương mẫu đi đầu của các em! Mong rằng tuần tới toàn lớp sẽ tiếp tục nỗ lực để có thêm nhiều bạn ghi danh trên Bảng Vàng!

Trân trọng chúc mừng các em và Quý gia đình!
👨‍🏫 GVCN: {gvcn} • Lớp {ten_lop}`,
  },

  // 5. Mẫu Nhắc Nhở Khẩn Chuyên Cần & Đi Học Muộn
  {
    id: 'urgent_attendance_alert',
    title: 'Nhắc nhở khẩn: Chuyên cần, đi học muộn & vi phạm nề nếp',
    description: 'Mẫu thông báo tập trung chấn chỉnh tình trạng đi học muộn, vắng tiết, trang phục sai quy định.',
    target: 'class_group',
    period: 'week',
    category: 'discipline',
    defaultOptions: {
      includeStats: true,
      includeHonors: false,
      includeViolations: true,
      maskViolationNames: false,
      includeTeacherContact: true,
      includeNextWeekPlan: true,
      includeMiniScoreTable: false,
      customNextWeekPlan: 'Kể từ đầu tuần tới, Ban cán sự lớp phối hợp Sao đỏ và Đoàn trường kiểm tra gắt gao tại cổng trường và cửa lớp: 1. Có mặt trước 6h50 sáng; 2. Trang phục sơ vin, thẻ học sinh/phù hiệu đầy đủ; 3. Trường hợp ốm đau gia đình phải gọi điện xin phép GVCN trước giờ truy bài.',
    },
    contentTemplate: `⚠️ THÔNG BÁO QUAN TRỌNG VỀ NỀ NẾP & CHUYÊN CẦN
🏫 Lớp {ten_lop} • Tuần {tuan} (Tháng {thang})
═══════════════════════════════

Kính gửi Quý Phụ huynh lớp {ten_lop},
Qua theo dõi sổ ghi nhận thi đua và tổng hợp nề nếp tuần qua, lớp chúng ta vẫn còn một số trường hợp vi phạm về giờ giấc, trang phục và chuyên cần làm ảnh hưởng tới điểm rèn luyện chung:

🔴 DANH SÁCH HỌC SINH CẦN GIA ĐÌNH ĐÔN ĐỐC NGAY:
{danh_sach_nhac_nho}

📋 YÊU CẦU BẮT BUỘC ĐỐI VỚI HỌC SINH TỪ ĐẦU TUẦN TỚI:
{ke_hoach_tuan_toi}

Kính đề nghị Quý Phụ huynh quan tâm, phối hợp nhắc nhở con em có mặt đúng giờ, chỉnh đốn tác phong trước khi đến trường để tránh bị trừ điểm thi đua trong các tuần tiếp theo.

Xin trân trọng cảm ơn sự phối hợp kịp thời của Quý phụ huynh!
👨‍🏫 GVCN: {gvcn} • SĐT: {sdt_gv}`,
  },

  // 6. Mẫu Khởi Động Tuần Mới & Tiết Chào Cờ Thứ Hai
  {
    id: 'weekly_kickoff_reminder',
    title: 'Nhắc nhở nề nếp đầu tuần & Chuẩn bị Chào cờ thứ Hai',
    description: 'Thông báo đôn đốc tác phong, đồng phục, chuẩn bị bài vở và giờ giấc trước buổi Chào cờ đầu tuần mới.',
    target: 'class_group',
    period: 'week',
    category: 'weekly',
    defaultOptions: {
      includeStats: false,
      includeHonors: false,
      includeViolations: false,
      maskViolationNames: false,
      includeTeacherContact: true,
      includeNextWeekPlan: true,
      includeMiniScoreTable: false,
      customNextWeekPlan: 'Nhắc nhở nề nếp tuần mới: 100% học sinh/học viên sơ vin gọn gàng, đeo thẻ học sinh; kiểm tra đầy đủ sách vở và đồ dùng học tập trước khi tới lớp; không sử dụng điện thoại sai quy định.',
    },
    contentTemplate: `🔔 THÔNG BÁO NỀ NẾP ĐẦU TUẦN & TIẾT CHÀO CỜ THỨ HAI
🏫 Lớp {ten_lop} • Tuần học thứ: {tuan}
═══════════════════════════════

Kính gửi Quý Phụ huynh và các em học sinh lớp {ten_lop},
Để khởi động tuần học thứ {tuan} với khí thế thi đua cao nhất và giữ vững điểm rèn luyện xuất sắc của lớp, Thầy/Cô {gvcn} xin nhắc nhở một số nội dung trọng tâm:

⏰ 1. GIỜ GIẤC & TÁC PHONG ĐẦU TUẦN:
• Có mặt tại trường trước 6h50 sáng để ổn định hàng ngũ dự Lễ Chào cờ đầu tuần.
• Trang phục: Đồng phục trường chuẩn chỉ, sơ vin gọn gàng, đeo thẻ học sinh/phù hiệu đầy đủ, đi giày hoặc dép có quai hậu.

📚 2. CHUẨN BỊ BÀI VỞ & ĐỒ DÙNG:
• Hoàn thành toàn bộ bài tập về nhà của các môn theo đúng thời khóa biểu.
• Mang đầy đủ sách giáo khoa, vở ghi, đồ dùng học tập và phương tiện phục vụ học tập.

🛡️ 3. CHẤP HÀNH NỘI QUY:
• Chấp hành nghiêm chỉnh Luật giao thông đường bộ, đội mũ bảo hiểm đạt chuẩn khi đi xe máy điện/xe đạp điện.
• Tuyệt đối không mang chất cấm, không sử dụng điện thoại trong giờ học khi chưa được giáo viên cho phép.

Kính chúc Quý Phụ huynh và các em học sinh một tuần mới tràn đầy năng lượng, sức khỏe và đạt nhiều kết quả rèn luyện tốt!

👨‍🏫 GVCN: {gvcn} • Lớp {ten_lop}
📞 Hotline liên hệ: {sdt_gv}`,
  },

  // 7. Mẫu Thông Báo Lịch Kiểm Tra & Ôn Tập
  {
    id: 'exam_schedule_notice',
    title: 'Thông báo Lịch kiểm tra / Thi kết thúc môn & Kế hoạch ôn tập',
    description: 'Thông báo kế hoạch kiểm tra định kỳ, ôn tập môn Toán/văn hóa, quy chế thi cử và đôn đốc gia đình kèm cặp.',
    target: 'class_group',
    period: 'week',
    category: 'notice',
    defaultOptions: {
      includeStats: false,
      includeHonors: false,
      includeViolations: false,
      maskViolationNames: false,
      includeTeacherContact: true,
      includeNextWeekPlan: true,
      includeMiniScoreTable: false,
      customNextWeekPlan: 'Kế hoạch kiểm tra: Lớp sẽ tiến hành kiểm tra định kỳ trong tuần tới. Học sinh chủ động bám sát đề cương ôn tập, chuẩn bị máy tính bỏ túi và đồ dùng học tập.',
    },
    contentTemplate: `📢 THÔNG BÁO LỊCH KIỂM TRA & KẾ HOẠCH ÔN TẬP
🏫 Lớp: {ten_lop} • Trường: {ten_truong}
Tuần: {tuan} (Tháng {thang})
═══════════════════════════════

Kính gửi Quý Phụ huynh lớp {ten_lop},
Thầy/Cô {gvcn} xin gửi tới Quý gia đình thông báo về kế hoạch kiểm tra định kỳ và đánh giá chất lượng học tập của lớp trong thời gian tới:

📝 NỘI DUNG & LỊCH KIỂM TRA TRỌNG TÂM:
{ke_hoach_tuan_toi}

🎯 YÊU CẦU ĐỐI VỚI HỌC SINH:
1. Chủ động ôn tập kỹ lý thuyết, hệ thống hóa công thức và rèn luyện các dạng bài tập theo đề cương ôn tập.
2. Chuẩn bị đầy đủ máy tính cầm tay, bút, thước kẻ, giấy nháp theo đúng quy định phòng thi.
3. Chấp hành nghiêm túc quy chế thi cử: Tuyệt đối trung thực, không sử dụng tài liệu trái phép, không mang điện thoại vào phòng thi.

👨‍👩‍👧‍👦 ĐỀ NGHỊ PHỐI HỢP TỪ GIA ĐÌNH:
Kính mong Quý Phụ huynh tạo điều kiện thuận lợi về thời gian, nhắc nhở con em tập trung tự học tại nhà vào các buổi tối, ngủ đủ giấc để có tinh thần tốt nhất làm bài đạt kết quả cao.

Trân trọng cảm ơn Quý Phụ huynh!
👨‍🏫 GVCN: {gvcn} • Lớp {ten_lop}
📞 Hotline: {sdt_gv}`,
  },

  // 8. Mẫu Thông Báo Lịch Nghỉ Lễ / Học Bù / Nội Vụ
  {
    id: 'holiday_makeup_notice',
    title: 'Thông báo Kế hoạch Nghỉ lễ / Học bù / Nề nếp lao động vệ sinh',
    description: 'Thông báo điều chỉnh lịch học, nghỉ lễ, học bù, trực nhật nội vụ giảng đường và an toàn giao thông.',
    target: 'class_group',
    period: 'week',
    category: 'notice',
    defaultOptions: {
      includeStats: false,
      includeHonors: false,
      includeViolations: false,
      maskViolationNames: false,
      includeTeacherContact: true,
      includeNextWeekPlan: true,
      includeMiniScoreTable: false,
      customNextWeekPlan: 'Kế hoạch điều chỉnh: Lớp nghỉ theo lịch chung của nhà trường; các buổi học bù và lịch trực nhật vệ sinh phòng học/xưởng thực hành sẽ thực hiện nghiêm theo phân công.',
    },
    contentTemplate: `📢 THÔNG BÁO KẾ HOẠCH ĐIỀU CHỈNH LỊCH HỌC & NỀ NẾP
🏫 Lớp {ten_lop} • {ten_truong}
═══════════════════════════════

Kính gửi Quý Phụ huynh và các em học sinh lớp {ten_lop},
Giáo viên chủ nhiệm xin gửi thông báo về kế hoạch điều chỉnh lịch học tập và công tác nề nếp của lớp như sau:

📌 CHI TIẾT LỊCH HỌC / NGHỈ HỌC / HỌC BÙ:
{ke_hoach_tuan_toi}

⚠️ MỘT SỐ NỘI DUNG LƯU Ý ĐẶC BIỆT:
• Về an toàn giao thông: Đề nghị gia đình quản lý chặt chẽ giờ giấc đi lại của con em, chấp hành nghiêm quy định an toàn giao thông khi tham gia lưu thông.
• Về tự học: Các em chủ động ôn tập kiến thức, không bỏ bê bài vở trong những ngày nghỉ.
• Về nội vụ giảng đường & xưởng nghề: Tổ trực nhật lớp tiến hành vệ sinh sạch sẽ phòng học/xưởng thực hành trước khi nghỉ, tắt toàn bộ hệ thống điện, đóng khóa cửa an toàn.

Kính chúc Quý Phụ huynh và các em học sinh luôn dồi dào sức khỏe và có những ngày nghỉ an toàn, ý nghĩa!

Trân trọng,
👨‍🏫 GVCN: {gvcn} • Lớp {ten_lop}
📞 SĐT: {sdt_gv}`,
  },

  // 9. Mẫu Báo Cáo Cá Nhân - Gửi Riêng Phụ Huynh (1-on-1)
  {
    id: 'individual_parent_report',
    title: 'Báo cáo điểm rèn luyện cá nhân học sinh (Gửi riêng phụ huynh)',
    description: 'Tin nhắn riêng tư, ấm áp, trang trọng gửi đến từng phụ huynh về điểm số, thứ hạng, chi tiết lỗi/điểm cộng và lời khuyên cụ thể.',
    target: 'individual_parent',
    period: 'week',
    category: 'individual',
    defaultOptions: {
      includeStats: false,
      includeHonors: true,
      includeViolations: true,
      maskViolationNames: false,
      includeTeacherContact: true,
      includeNextWeekPlan: false,
      includeMiniScoreTable: false,
    },
    contentTemplate: `Kính gửi Quý phụ huynh học sinh {ho_ten_hs},

Thầy/Cô {gvcn} - GVCN lớp {ten_lop}, {ten_truong} xin trân trọng gửi tới Quý gia đình kết quả rèn luyện nề nếp của em trong {tieu_de_ky}:

📋 KẾT QUẢ RÈN LUYỆN NỀ NẾP ({ky_danh_gia}):
• Học sinh: {ho_ten_hs} (Mã HS: {ma_hs})
• Điểm rèn luyện đạt được: {diem_hs} điểm (Xếp loại: {xep_loai_hs} • {xep_hang_hs})
• Tổng điểm thưởng: +{tong_diem_cong_hs}đ | Điểm trừ vi phạm: -{tong_diem_tru_hs}đ

🌟 CHI TIẾT ĐIỂM CỘNG & KHEN THƯỞNG:
{chi_tiet_khen_thuong}

⚠️ NỘI DUNG CẦN LƯU Ý / ĐIỂM TRỪ NỀ NẾP:
{chi_tiet_loi}

💬 LỜI NHẮN TỪ GIÁO VIÊN CHỦ NHIỆM:
{loi_nhan_gv}

Kính mong Quý gia đình tiếp tục đồng hành, động viên và nhắc nhở em duy trì tốt nề nếp học tập. Nếu gia đình cần trao đổi thêm bất kỳ thông tin nào, xin vui lòng liên hệ trực tiếp với Thầy/Cô.

Trân trọng cảm ơn Quý phụ huynh!
👨‍🏫 GVCN: {gvcn} • Lớp {ten_lop}
📞 Hotline liên hệ: {sdt_gv}`,
  },

  // 10. Mẫu Nhắc Nhở Riêng Vi Phạm Nề Nếp / Chuyên Cần (1-on-1)
  {
    id: 'individual_parent_urgent_discipline',
    title: 'Nhắc nhở riêng: Vi phạm nề nếp / Chuyên cần cần gia đình phối hợp',
    description: 'Tin nhắn tế nhị gửi riêng phụ huynh khi học sinh có vi phạm nề nếp, đi muộn hoặc bị trừ điểm, cần gia đình sát sao uốn nắn.',
    target: 'individual_parent',
    period: 'week',
    category: 'discipline',
    defaultOptions: {
      includeStats: false,
      includeHonors: false,
      includeViolations: true,
      maskViolationNames: false,
      includeTeacherContact: true,
      includeNextWeekPlan: false,
      includeMiniScoreTable: false,
    },
    contentTemplate: `Kính gửi Quý phụ huynh học sinh {ho_ten_hs},

Thầy/Cô {gvcn} - Giáo viên chủ nhiệm lớp {ten_lop}, {ten_truong} xin phép gửi lời chào trân trọng tới Quý gia đình.

Thầy/Cô xin trao đổi riêng cùng Quý phụ huynh về tình hình nề nếp của em {ho_ten_hs} (Mã HS: {ma_hs}) trong {tieu_de_ky}:

📊 THÔNG TIN ĐIỂM RÈN LUYỆN ({ky_danh_gia}):
• Điểm rèn luyện: {diem_hs} điểm (Xếp loại: {xep_loai_hs})
• Tình trạng: Điểm rèn luyện bị giảm do ghi nhận các vi phạm nề nếp sau (Tổng trừ: -{tong_diem_tru_hs}đ):

⚠️ CHI TIẾT CÁC LỖI VI PHẠM ĐÃ GHI NHẬN:
{chi_tiet_loi}

💬 Ý KIẾN CỦA GIÁO VIÊN CHỦ NHIỆM:
{loi_nhan_gv}

Để giúp em nhanh chóng khắc phục dứt điểm các thiếu sót trên và giữ vững kết quả rèn luyện tốt trong các tuần tới, Thầy/Cô kính nhờ Quý gia đình quan tâm, trò chuyện và đôn đốc em sát sao hơn tại nhà (đặc biệt về giờ giấc thức dậy, chuẩn bị đồ dùng và tác phong trước khi đến trường).

Thầy/Cô rất mong nhận được sự phối hợp đồng hành từ Quý phụ huynh!

Trân trọng,
👨‍🏫 GVCN: {gvcn} • Lớp {ten_lop}
📞 SĐT liên hệ: {sdt_gv}`,
  },

  // 11. Mẫu Thư Khen & Tuyên Dương Thành Tích Xuất Sắc (1-on-1)
  {
    id: 'individual_parent_honors_praise',
    title: 'Thư khen & Tuyên dương thành tích rèn luyện xuất sắc của học sinh',
    description: 'Tin nhắn gửi riêng chúc mừng phụ huynh khi học sinh đạt điểm xuất sắc, có việc tốt, khen thưởng hoặc đứng đầu lớp.',
    target: 'individual_parent',
    period: 'week',
    category: 'honors',
    defaultOptions: {
      includeStats: false,
      includeHonors: true,
      includeViolations: false,
      maskViolationNames: false,
      includeTeacherContact: true,
      includeNextWeekPlan: false,
      includeMiniScoreTable: false,
    },
    contentTemplate: `Kính gửi Quý phụ huynh học sinh {ho_ten_hs},

Thầy/Cô {gvcn} - GVCN lớp {ten_lop}, {ten_truong} trân trọng gửi lời chúc mừng nồng nhiệt tới Quý gia đình!

Thầy/Cô rất vui mừng thông báo kết quả rèn luyện nề nếp và tinh thần học tập xuất sắc của em {ho_ten_hs} (Mã HS: {ma_hs}) trong {tieu_de_ky}:

🏆 THÀNH TÍCH ĐẠT ĐƯỢC ({ky_danh_gia}):
• Điểm rèn luyện xuất sắc: {diem_hs} điểm
• Xếp loại thi đua: {xep_loai_hs} ({xep_hang_hs})
• Điểm thưởng tích lũy: +{tong_diem_cong_hs}đ
• Ý thức chấp hành nề nếp: Xuất sắc, gương mẫu đi đầu trong toàn bộ các hoạt động của lớp.

🌟 GHI NHẬN THÀNH TÍCH & ĐIỂM CỘNG TIÊU BIỂU:
{chi_tiet_khen_thuong}

💬 LỜI BIỂU DƯƠNG TỪ GIÁO VIÊN CHỦ NHIỆM:
{loi_nhan_gv}

Thầy/Cô nhiệt liệt biểu dương tinh thần tự giác, ý thức đạo đức và thái độ học tập mẫu mực của em {ho_ten_hs}. Cảm ơn Quý phụ huynh đã luôn đồng hành, dạy bảo chu đáo để em có được sự tiến bộ và thành tích đáng tự hào này!

Trân trọng chúc mừng em và Quý gia đình!
👨‍🏫 GVCN: {gvcn} • Lớp {ten_lop}
📞 SĐT: {sdt_gv}`,
  },

  // 12. Mẫu Thư Mời Trao Đổi Trực Tiếp Với GVCN (1-on-1)
  {
    id: 'individual_parent_meeting_invite',
    title: 'Thư mời phụ huynh trao đổi trực tiếp về học tập & nề nếp',
    description: 'Thư mời lịch sự, chân thành gửi riêng phụ huynh để hẹn lịch trao đổi trực tiếp hoặc qua điện thoại nhằm phối hợp giáo dục.',
    target: 'individual_parent',
    period: 'week',
    category: 'notice',
    defaultOptions: {
      includeStats: false,
      includeHonors: false,
      includeViolations: true,
      maskViolationNames: false,
      includeTeacherContact: true,
      includeNextWeekPlan: false,
      includeMiniScoreTable: false,
    },
    contentTemplate: `Kính gửi Quý phụ huynh học sinh {ho_ten_hs},

Thầy/Cô {gvcn} - Giáo viên chủ nhiệm lớp {ten_lop}, {ten_truong} trân trọng gửi lời chào và lời chúc sức khỏe tới Quý gia đình.

Nhằm giúp em {ho_ten_hs} (Mã HS: {ma_hs}) có định hướng học tập và rèn luyện nề nếp tốt hơn trong thời gian tới, Thầy/Cô kính mời Quý phụ huynh sắp xếp thời gian để trao đổi cùng GVCN:

📌 TÌNH HÌNH RÈN LUYỆN HIỆN TẠI CỦA EM ({ky_danh_gia}):
• Điểm rèn luyện: {diem_hs} điểm (Xếp loại: {xep_loai_hs} • Điểm trừ: -{tong_diem_tru_hs}đ)
• Nội dung cần lưu tâm:
{chi_tiet_loi}

🤝 NỘI DUNG TRAO ĐỔI DỰ KIẾN:
• Trao đổi về tình hình học tập trên lớp, ý thức chấp hành nội quy và chuyên cần của em.
• Cùng thống nhất giải pháp giữa gia đình và nhà trường nhằm hỗ trợ em khắc phục khó khăn và tiến bộ nhanh nhất.

⏰ HÌNH THỨC & THỜI GIAN TRAO ĐỔI:
• Thời gian: Quý phụ huynh vui lòng liên hệ trực tiếp với Thầy/Cô để hẹn khung giờ thuận tiện nhất trong tuần (ngoài giờ giảng dạy).
• Hình thức: Trao đổi qua điện thoại hoặc gặp trực tiếp tại Văn phòng Khoa/Trường.

Rất mong nhận được sự quan tâm và phản hồi từ Quý phụ huynh để cùng đồng hành vì sự tiến bộ của em!

Trân trọng,
👨‍🏫 GVCN: {gvcn} • Lớp {ten_lop}
📞 Hotline liên hệ: {sdt_gv}`,
  },
];

const LOCAL_STORAGE_CUSTOM_TEMPLATES_KEY = 'so_cham_diem_custom_zalo_templates_v1';

export function getStoredCustomTemplates(): ZaloMessageTemplate[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CUSTOM_TEMPLATES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading custom templates:', e);
    return [];
  }
}

export function saveStoredCustomTemplates(templates: ZaloMessageTemplate[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));
  } catch (e) {
    console.error('Error saving custom templates:', e);
  }
}

/**
 * Resolves all smart tags into actual text based on current context
 */
export function resolveTemplateTags(params: {
  templateText: string;
  options: TemplateOptions;
  classConfig: ClassConfig;
  students: Student[];
  disciplineLogs: DisciplineLog[];
  weeklySummaries?: StudentWeeklySummary[];
  monthlySummaries?: StudentMonthlySummary[];
  selectedWeek: number;
  selectedMonth: number;
  periodMode: 'week' | 'month';
  selectedStudent?: Student | null;
}): string {
  const {
    templateText,
    options,
    classConfig,
    students,
    disciplineLogs,
    weeklySummaries = [],
    monthlySummaries = [],
    selectedWeek,
    selectedMonth,
    periodMode,
    selectedStudent,
  } = params;

  // Active student list
  const activeStudents = students.filter((s) => s.status === 'active');
  const activeStudentIds = new Set(activeStudents.map((s) => s.id));

  // Summaries based strictly on periodMode
  const currentSummaries = periodMode === 'week' ? weeklySummaries : monthlySummaries;

  // Filter summaries for active students if available to guarantee 100% mathematical consistency
  const targetSummaries = currentSummaries.filter((s) => {
    if (activeStudentIds.size === 0) return true;
    return activeStudentIds.has(s.studentId);
  });
  const totalCount = targetSummaries.length || currentSummaries.length || students.length;

  // Compute stats based on targetSummaries
  const scores = targetSummaries.map((s) => s.finalScore);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : (classConfig.baseScore || 10);

  const xuatSacCount = targetSummaries.filter((s) => s.rank === 'Xuất sắc').length;
  const totCount = targetSummaries.filter((s) => s.rank === 'Tốt').length;
  const khaCount = targetSummaries.filter((s) => s.rank === 'Khá').length;
  const trungBinhCount = targetSummaries.filter((s) => s.rank === 'Trung bình' || s.rank === 'Đạt').length;
  const yeuCount = targetSummaries.filter((s) => s.rank === 'Yếu' || s.rank === 'Không đạt').length;

  const totXuatSacCount = xuatSacCount + totCount;
  const tiLeTot = totalCount > 0 ? Math.round((totXuatSacCount / totalCount) * 100) : 0;
  const tiLeXuatSac = totalCount > 0 ? Math.round((xuatSacCount / totalCount) * 100) : 0;

  const noViolationCount = targetSummaries.filter((s) => (s.violationCount || 0) === 0 && (s.totalDeduct || 0) === 0).length;
  const tiLeKhongViPham = totalCount > 0 ? Math.round((noViolationCount / totalCount) * 100) : 0;

  const totalViolations = targetSummaries.reduce((acc, curr) => acc + (curr.violationCount || 0), 0);
  const totalDeduct = targetSummaries.reduce((acc, curr) => acc + (curr.totalDeduct || 0), 0);
  const totalBonus = targetSummaries.reduce((acc, curr) => acc + (curr.totalBonus || 0), 0);

  // Period-specific logs strictly aligned with periodMode
  const periodLogs = disciplineLogs.filter((l) => {
    if (periodMode === 'week') {
      return l.weekNumber === selectedWeek;
    }
    return l.month === selectedMonth;
  });

  // 1. Generate Danh Sách Khen Thưởng ({danh_sach_khen_thuong})
  let danhSachKhenThuongText = '';
  if (!options.includeHonors) {
    danhSachKhenThuongText = '(Không bao gồm danh sách khen thưởng theo tùy chọn)';
  } else {
    // Filter students with good/excellent score or with bonus points
    const minHonorScore = classConfig.rankThresholds?.tot ?? 8.0;
    const topStudents = [...targetSummaries]
      .filter((s) => s.finalScore >= minHonorScore || (s.totalBonus && s.totalBonus > 0) || (s.bonusCount && s.bonusCount > 0))
      .sort((a, b) => b.finalScore - a.finalScore || (b.totalBonus || 0) - (a.totalBonus || 0));

    if (topStudents.length === 0) {
      danhSachKhenThuongText = periodMode === 'week'
        ? 'Tuần này cả lớp duy trì rèn luyện ổn định, chưa có cá nhân đạt điểm đột phá.'
        : 'Tháng này cả lớp duy trì rèn luyện ổn định, chưa có cá nhân nhận điểm thưởng thi đua.';
    } else {
      const lines: string[] = [];
      topStudents.slice(0, 15).forEach((item, index) => {
        const bonusDesc = item.achievements && item.achievements.length > 0 ? ` (${item.achievements.join(', ')})` : '';
        const bonusPoint = item.totalBonus && item.totalBonus > 0 ? ` [Thưởng: +${formatVietnameseNumber(item.totalBonus)}đ]` : '';
        lines.push(`${index + 1}. ${item.fullName} - ${formatVietnameseNumber(item.finalScore)}đ (${item.rank})${bonusPoint}${bonusDesc}`);
      });
      if (topStudents.length > 15) {
        lines.push(`... cùng ${topStudents.length - 15} em học sinh khác có ý thức rèn luyện rất tốt.`);
      }
      danhSachKhenThuongText = lines.join('\n');
    }
  }

  // 2. Generate Danh Sách Nhắc Nhở Vi Phạm ({danh_sach_nhac_nho})
  let danhSachNhacNhoText = '';
  if (!options.includeViolations) {
    danhSachNhacNhoText = '(Không bao gồm danh sách nhắc nhở theo tùy chọn)';
  } else {
    const minWarningScore = classConfig.rankThresholds?.tot ?? 8.0;
    const studentsWithViolations = [...targetSummaries]
      .filter((s) => s.totalDeduct > 0 || (s.violationCount && s.violationCount > 0) || s.finalScore < minWarningScore)
      .sort((a, b) => (b.totalDeduct || 0) - (a.totalDeduct || 0) || a.finalScore - b.finalScore);

    if (studentsWithViolations.length === 0) {
      danhSachNhacNhoText = 'Tập thể lớp chấp hành xuất sắc mọi quy định, không có học sinh vi phạm nề nếp!';
    } else {
      const lines: string[] = [];
      studentsWithViolations.forEach((item, index) => {
        // Collect specific error details
        const studentLogs = periodLogs.filter((l) => l.studentId === item.studentId && l.type === 'deduct');
        const errorSummaries = studentLogs.map((l) => {
          const sessionOrPeriod = l.periodOrTime ? ` [${l.periodOrTime}]` : '';
          return `${l.behaviorDescription}${sessionOrPeriod} (-${formatVietnameseNumber(l.totalScore)}đ)`;
        }).slice(0, 3);
        const errorText = errorSummaries.length > 0 ? `: ${errorSummaries.join(', ')}` : '';

        // Check if masked
        let displayName = item.fullName;
        if (options.maskViolationNames) {
          const parts = item.fullName.split(' ');
          if (parts.length > 2) {
            displayName = `${parts[0]} ${parts.slice(1, -1).map(p => p[0] + '.').join(' ')} ${parts[parts.length - 1]} (Mã: ${item.studentCode})`;
          } else {
            displayName = `${item.fullName} (Mã: ${item.studentCode})`;
          }
        }

        const deductStr = item.totalDeduct > 0 ? `, Trừ: -${formatVietnameseNumber(item.totalDeduct)}đ` : '';
        lines.push(`• ${index + 1}. ${displayName} (Điểm: ${formatVietnameseNumber(item.finalScore)}đ${deductStr})${errorText}`);
      });
      danhSachNhacNhoText = lines.join('\n');
    }
  }

  // 3. Generate Top 10 Bảng Điểm ({bang_diem_top_10})
  const top10List = [...targetSummaries]
    .sort((a, b) => b.finalScore - a.finalScore || (b.totalBonus || 0) - (a.totalBonus || 0))
    .slice(0, 10);
  const bangDiemTop10Text = top10List
    .map((s, idx) => `${idx + 1}. ${s.fullName} (${s.studentCode}): ${formatVietnameseNumber(s.finalScore)}đ - ${s.rank}`)
    .join('\n');

  // 4. Generate Bảng Điểm Rút Gọn Cả Lớp ({bang_diem_rut_gon})
  const bangDiemRutGonText = [...targetSummaries]
    .sort((a, b) => compareVietnameseNames(a, b))
    .map((s, idx) => `${idx + 1}. ${s.fullName}: ${formatVietnameseNumber(s.finalScore)}đ [${s.rank}]`)
    .join('\n');

  // 5. Generate Kế hoạch tuần tới ({ke_hoach_tuan_toi})
  const keHoachTuanToiText = options.customNextWeekPlan?.trim() || options.customTeacherNote?.trim() || classConfig.defaultTeacherNote?.trim() ||
    'Duy trì nghiêm nề nếp chuyên cần, đồng phục, chuẩn bị bài chu đáo trước khi tới trường, thực hiện tốt nội quy lớp học.';

  // 6. Individual Student Specific Tags
  let studentFullName = '';
  let studentCode = '';
  let studentScore = '';
  let studentRank = '';
  let studentRankPos = '';
  let studentDeductScore = '0';
  let studentBonusScore = '0';
  let studentViolationCount = '0';
  let studentBonusCount = '0';
  let studentViolationsDetail = '';
  let studentBonusDetail = '';
  let studentTeacherAdvice = '';
  let studentParentPhone = '';

  if (selectedStudent) {
    studentFullName = selectedStudent.fullName;
    studentCode = selectedStudent.studentCode;
    studentParentPhone = selectedStudent.parentPhone || 'Chưa cập nhật';

    const studSummary = currentSummaries.find((s) => s.studentId === selectedStudent.id);
    if (studSummary) {
      studentScore = formatVietnameseNumber(studSummary.finalScore);
      studentRank = studSummary.rank;
      studentDeductScore = formatVietnameseNumber(studSummary.totalDeduct || 0);
      studentBonusScore = formatVietnameseNumber(studSummary.totalBonus || 0);
      studentViolationCount = String(studSummary.violationCount || 0);
      studentBonusCount = String(studSummary.bonusCount || 0);
    } else {
      studentScore = formatVietnameseNumber(classConfig.baseScore || 10);
      studentRank = 'Xuất sắc';
      studentDeductScore = '0';
      studentBonusScore = '0';
      studentViolationCount = '0';
      studentBonusCount = '0';
    }

    // Compute student class rank position
    const sortedSummaries = [...targetSummaries].sort(
      (a, b) => b.finalScore - a.finalScore || (b.totalBonus || 0) - (a.totalBonus || 0)
    );
    const studentRankIdx = sortedSummaries.findIndex((s) => s.studentId === selectedStudent.id);
    studentRankPos = studentRankIdx >= 0 ? `Hạng ${studentRankIdx + 1}/${totalCount}` : 'Đang cập nhật';

    const studLogs = periodLogs.filter((l) => l.studentId === selectedStudent.id);
    const studViolations = studLogs.filter((l) => l.type === 'deduct');
    const studBonuses = studLogs.filter((l) => l.type === 'bonus');

    if (studViolations.length > 0) {
      studentViolationsDetail = studViolations
        .map((v) => {
          const sessionOrPeriod = v.periodOrTime ? ` [${v.periodOrTime}]` : '';
          return `• ${formatVietnameseDate(v.date)}${sessionOrPeriod}: ${v.behaviorDescription} (-${formatVietnameseNumber(v.totalScore)}đ)`;
        })
        .join('\n');
    } else {
      studentViolationsDetail = 'Em không có bất kỳ vi phạm nào trong suốt thời gian qua (Đạt chuẩn 100%).';
    }

    if (studBonuses.length > 0) {
      studentBonusDetail = studBonuses
        .map((b) => {
          const sessionOrPeriod = b.periodOrTime ? ` [${b.periodOrTime}]` : '';
          return `• ${formatVietnameseDate(b.date)}${sessionOrPeriod}: ${b.behaviorDescription} (+${formatVietnameseNumber(b.totalScore)}đ)`;
        })
        .join('\n');
    } else {
      studentBonusDetail = 'Chưa có ghi nhận điểm cộng thi đua.';
    }

    // Personalized teacher advice
    if (options.customTeacherNote?.trim()) {
      studentTeacherAdvice = options.customTeacherNote.trim();
    } else if (studSummary) {
      if (studSummary.totalDeduct === 0 && studSummary.totalBonus > 0) {
        studentTeacherAdvice = `Em ${selectedStudent.firstName} có ý thức rèn luyện rất tích cực, chủ động và gương mẫu. Thầy/Cô rất khen ngợi tinh thần của em và mong gia đình tiếp tục khích lệ con!`;
      } else if (studSummary.totalDeduct === 0) {
        studentTeacherAdvice = `Em ${selectedStudent.firstName} duy trì nề nếp ổn định, nghiêm túc chấp hành tốt mọi nội quy trường lớp. Kính chúc gia đình và em luôn nhiều sức khỏe, niềm vui!`;
      } else if (studSummary.finalScore >= (classConfig.rankThresholds?.tot ?? 8.0)) {
        studentTeacherAdvice = `Về cơ bản em ${selectedStudent.firstName} ngoan và có ý thức tốt. Gia đình lưu ý nhắc nhở thêm em chú ý một số lỗi nhỏ nêu trên để tuần tới em đạt kết quả rèn luyện xuất sắc hơn.`;
      } else {
        studentTeacherAdvice = `Thầy/Cô kính nhờ Quý Phụ huynh cùng đồng hành, sát sao nhắc nhở và đôn đốc em ${selectedStudent.firstName} khắc phục dứt điểm các lỗi vi phạm nêu trên để kịp thời tiến bộ trong tuần tới.`;
      }
    }
  }

  // Current Date string formatted in Vietnamese
  const today = new Date();
  const dateString = `Thứ ${today.getDay() === 0 ? 'Chủ Nhật' : today.getDay() + 1}, ngày ${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
  const kyDanhGiaText = periodMode === 'week' ? `Tuần ${selectedWeek}` : `Tháng ${selectedMonth}`;
  const tieuDeKyText = periodMode === 'week' ? `Tuần ${selectedWeek} (Tháng ${selectedMonth})` : `Tháng ${selectedMonth}`;

  // Replace map
  const replacements: Record<string, string> = {
    '{ten_lop}': classConfig.className || '10A8',
    '{gvcn}': classConfig.homeroomTeacher || 'Nguyễn Văn Sang',
    '{khoa}': 'Khoa Cơ bản',
    '{sdt_gv}': classConfig.teacherPhone || 'Chưa cập nhật SĐT',
    '{ten_truong}': classConfig.schoolName || 'Trường Cao đẳng nghề số 1 - BQP',
    '{nien_khoa}': classConfig.schoolYear || '2025 - 2026',
    '{tuan}': String(selectedWeek),
    '{thang}': String(selectedMonth),
    '{ky_danh_gia}': kyDanhGiaText,
    '{tieu_de_ky}': tieuDeKyText,
    '{diem_nen}': formatVietnameseNumber(classConfig.baseScore || 10),
    '{ngay_thang}': dateString,

    '{si_so}': String(totalCount),
    '{diem_tb_lop}': formatVietnameseNumber(Math.round(avgScore * 100) / 100, 2),
    '{so_xuat_sac}': String(xuatSacCount),
    '{ti_le_xuat_sac}': String(tiLeXuatSac),
    '{so_tot}': String(totCount),
    '{so_tot_xuat_sac}': String(totXuatSacCount),
    '{so_kha}': String(khaCount),
    '{so_trung_binh}': String(trungBinhCount),
    '{so_yeu}': String(yeuCount),
    '{ti_le_tot}': String(tiLeTot),
    '{so_khong_vi_pham}': String(noViolationCount),
    '{ti_le_khong_vi_pham}': String(tiLeKhongViPham),
    '{tong_luot_loi}': String(totalViolations),
    '{tong_diem_tru}': formatVietnameseNumber(Math.round(totalDeduct * 100) / 100),
    '{tong_diem_cong}': formatVietnameseNumber(Math.round(totalBonus * 100) / 100),

    '{danh_sach_khen_thuong}': danhSachKhenThuongText,
    '{danh_sach_nhac_nho}': danhSachNhacNhoText,
    '{bang_diem_top_10}': bangDiemTop10Text,
    '{bang_diem_rut_gon}': bangDiemRutGonText,
    '{ke_hoach_tuan_toi}': keHoachTuanToiText,

    '{ho_ten_hs}': studentFullName,
    '{ma_hs}': studentCode,
    '{diem_hs}': studentScore,
    '{xep_loai_hs}': studentRank,
    '{xep_hang_hs}': studentRankPos,
    '{tong_diem_tru_hs}': studentDeductScore,
    '{tong_diem_cong_hs}': studentBonusScore,
    '{so_loi_hs}': studentViolationCount,
    '{so_khen_thuong_hs}': studentBonusCount,
    '{chi_tiet_loi}': studentViolationsDetail,
    '{chi_tiet_khen_thuong}': studentBonusDetail,
    '{loi_nhan_gv}': studentTeacherAdvice,
    '{sdt_phu_huynh}': studentParentPhone,
    '{ma_tra_cuu}': 'Dùng liên kết riêng do giáo viên cấp',
    '{link_tra_cuu}': typeof window !== 'undefined'
      ? `${window.location.origin}/#tra-cuu`
      : '/#tra-cuu',
  };

  let result = templateText;
  Object.keys(replacements).forEach((tag) => {
    // Replace all instances of tag
    result = result.split(tag).join(replacements[tag]);
  });

  // If option includeMiniScoreTable is true and result does NOT already contain bang_diem_rut_gon
  if (options.includeMiniScoreTable && !templateText.includes('{bang_diem_rut_gon}')) {
    result += `\n\n📋 BẢNG ĐIỂM TÓM TẮT CẢ LỚP:\n${bangDiemRutGonText}`;
  }

  return result;
}
