import { BehaviorCategory } from '../types';
import { removeVietnameseAccents } from './utils';

// Expand the bundled compound rules without changing catalog IDs or configured scores.
const specificNames: Record<string, string[]> = {
  // Đi học muộn, tác phong, trật tự, học tập
  'Đi học muộn; sai tác phong; mất trật tự hoặc làm việc riêng; không ghi chép; không trực nhật; ăn quà vặt': [
    'Đi học muộn',
    'Sai tác phong',
    'Mất trật tự trong giờ học',
    'Làm việc riêng trong giờ học',
    'Không ghi chép bài',
    'Không trực nhật',
    'Ăn quà vặt',
  ],
  'Đi học muộn/ Vào lớp muộn': ['Đi học muộn'],
  'Mang mặc không đúng tác phong (quần áo, giày dép, thẻ đeo)': ['Sai tác phong'],
  'Mất trật tự/ Ngủ trong giờ': ['Mất trật tự trong giờ học', 'Ngủ trong giờ học'],
  'Không tập trung, làm việc riêng trong giờ học, không ghi chép bài.': [
    'Làm việc riêng trong giờ học',
    'Không ghi chép bài',
  ],
  'Không tập trung, làm việc riêng trong giờ học, không ghi chép bài': [
    'Làm việc riêng trong giờ học',
    'Không ghi chép bài',
  ],
  'Thiếu sách vở, đồ dùng học tập': ['Thiếu sách vở, đồ dùng học tập'],
  'Không trực nhật/ Trốn trực nhật lớp': ['Không trực nhật'],
  'Ăn quà vặt trong giờ': ['Ăn quà vặt'],
  'bị điểm kém dưới 5': ['Bị điểm kém dưới 5'],

  // Điện thoại
  'Không nộp điện thoại hoặc sử dụng điện thoại trái phép trong giờ học': [
    'Không nộp điện thoại',
    'Sử dụng điện thoại trái phép trong giờ học',
  ],
  'Không nộp điện thoại; sử dụng điện thoại trong giờ học khi không được giáo viên cho phép.': [
    'Không nộp điện thoại',
    'Sử dụng điện thoại trái phép trong giờ học',
  ],
  'Không nộp điện thoại; sử dụng điện thoại trong giờ học khi không được giáo viên cho phép': [
    'Không nộp điện thoại',
    'Sử dụng điện thoại trái phép trong giờ học',
  ],

  // Trốn tiết, nghỉ học, ngủ
  'Trốn tiết, ngủ trong giờ, nghỉ học tự do hoặc không có lý do chính đáng': [
    'Trốn tiết',
    'Ngủ trong giờ học',
    'Nghỉ học không phép',
  ],
  'Trốn tiết, nghỉ học tự do hoặc lý do không chính đáng': [
    'Trốn tiết',
    'Nghỉ học không phép',
  ],
  'Nghỉ học có phép': ['Nghỉ học có phép'],

  // Thuốc lá, ma túy, chất cấm
  'Mua bán/sử dụng thuốc lá, thuốc lá điện tử, ma túy, chất gây nghiện hoặc chất cấm': [
    'Mua bán thuốc lá',
    'Sử dụng thuốc lá',
    'Mua bán thuốc lá điện tử',
    'Sử dụng thuốc lá điện tử',
    'Sử dụng ma túy, chất gây nghiện hoặc chất cấm',
  ],
  'Mua bán, sử dụng thuốc lá, thuốc lá điện tử, ma túy, chất gây nghiện và các chất cấm khác.': [
    'Mua bán thuốc lá',
    'Sử dụng thuốc lá',
    'Mua bán thuốc lá điện tử',
    'Sử dụng thuốc lá điện tử',
    'Sử dụng ma túy, chất gây nghiện hoặc chất cấm',
  ],
  'Mua bán, sử dụng thuốc lá, thuốc lá điện tử, ma túy, chất gây nghiện và các chất cấm khác': [
    'Mua bán thuốc lá',
    'Sử dụng thuốc lá',
    'Mua bán thuốc lá điện tử',
    'Sử dụng thuốc lá điện tử',
    'Sử dụng ma túy, chất gây nghiện hoặc chất cấm',
  ],

  // Tài sản, trộm cắp
  'Làm hư hỏng tài sản nhà trường hoặc lấy cắp/tiêu thụ tài sản lấy cắp': [
    'Làm hư hỏng tài sản nhà trường',
    'Lấy cắp tài sản',
    'Tiêu thụ tài sản lấy cắp',
  ],
  'Làm hư hỏng tài sản của nhà trường: Bàn ghế, trang thiết bị phục vụ học tập, Lấy cắp tài sản, chứa chấp, tiêu thụ tài sản lấy cắp': [
    'Làm hư hỏng tài sản nhà trường',
    'Lấy cắp tài sản',
    'Tiêu thụ tài sản lấy cắp',
  ],

  // Vô lễ, xúc phạm
  'Vô lễ hoặc xúc phạm cán bộ, giáo viên, nhân viên nhà trường': [
    'Vô lễ với cán bộ, giáo viên, nhân viên nhà trường',
    'Xúc phạm cán bộ, giáo viên, nhân viên nhà trường',
  ],
  'Vô lễ, xúc phạm danh dự, nhân phẩm cán bộ, giáo viên, nhân viên Nhà trường': [
    'Vô lễ với cán bộ, giáo viên, nhân viên nhà trường',
    'Xúc phạm cán bộ, giáo viên, nhân viên nhà trường',
  ],

  // Đánh nhau, gây gổ
  'Gây gổ, đánh nhau, gây thương tích, tổ chức hoặc cổ vũ đánh nhau': [
    'Gây gổ',
    'Đánh nhau',
    'Gây thương tích',
    'Tổ chức hoặc cổ vũ đánh nhau',
  ],
  'Gây gổ đánh nhau, đánh nhau gây thương tích; tổ chức, tham gia hoặc cổ vũ đánh nhau trong và ngoài trường': [
    'Gây gổ',
    'Đánh nhau',
    'Gây thương tích',
    'Tổ chức hoặc cổ vũ đánh nhau',
  ],
  'Gây gỡ, đánh nhau, gây thương tích, tổ chức hoặc cổ vũ đánh nhau': [
    'Gây gổ',
    'Đánh nhau',
    'Gây thương tích',
    'Tổ chức hoặc cổ vũ đánh nhau',
  ],
  'Gây gỡ đánh nhau, đánh nhau gây thương tích; tổ chức, tham gia hoặc cổ vũ đánh nhau trong và ngoài trường': [
    'Gây gổ',
    'Đánh nhau',
    'Gây thương tích',
    'Tổ chức hoặc cổ vũ đánh nhau',
  ],

  // Người lạ, an ninh, cờ bạc
  'Đưa người lạ vào trường gây rối hoặc đánh bạc': [
    'Đưa người lạ vào trường gây rối',
    'Chơi cờ bạc, tổ chức đánh bạc',
  ],
  'Cấu kết, móc nối đưa người lạ, phần tử xấu vào trường gây rối, làm ảnh hưởng đến an ninh, trật tự trong trường. Chơi cờ bạc dưới mọi hình thức, tổ chức đánh bạc': [
    'Đưa người lạ vào trường gây rối',
    'Chơi cờ bạc, tổ chức đánh bạc',
  ],

  // Khen thưởng
  'Đi học đúng giờ, đầy đủ cả tuần': ['Đi học đúng giờ, đầy đủ cả tuần'],
  'Phát biểu tích cực hoặc đạt điểm kiểm tra miệng/15 phút từ 9 đến 10': [
    'Phát biểu tích cực',
    'Đạt điểm kiểm tra miệng từ 9 đến 10',
    'Đạt điểm kiểm tra 15 phút từ 9 đến 10',
  ],
  'Gương người tốt việc tốt, giúp đỡ bạn': ['Gương người tốt việc tốt', 'Giúp đỡ bạn'],
  'Tích cực tham gia các phong trào, hoạt động của lớp, trường': [
    'Tích cực tham gia phong trào, hoạt động lớp/trường',
  ],
};

export function getBehaviorSuggestions(categories: BehaviorCategory[], query: string) {
  const words = removeVietnameseAccents(query).split(/\s+/).filter(Boolean);
  const seenKeys = new Set<string>();

  return categories.flatMap((category) => {
    const trimmedName = (category.name || '').trim();
    const names = specificNames[trimmedName] || specificNames[category.name] || [category.name];
    return names
      .map((name) => ({ category, name }))
      .filter(({ name, category: cat }) => {
        // Deduplicate identical behaviors across categories
        const dedupeKey = `${cat.type}_${cat.defaultScore}_${removeVietnameseAccents(name.toLowerCase())}`;
        if (seenKeys.has(dedupeKey)) return false;
        seenKeys.add(dedupeKey);

        // Compound rules must match the specific choice, not another choice's keywords.
        const searchable = removeVietnameseAccents(
          [name, cat.code, ...(names.length === 1 ? cat.keywords || [] : [])].join(' ')
        );
        return words.every((word) => searchable.includes(word));
      });
  });
}
