import { BehaviorCategory } from '../types';
import { removeVietnameseAccents } from './utils';

// Expand the bundled compound rules without changing catalog IDs or configured scores.
const specificNames: Record<string, string[]> = {
  'Đi học muộn; sai tác phong; mất trật tự hoặc làm việc riêng; không ghi chép; không trực nhật; ăn quà vặt': ['Đi học muộn', 'Sai tác phong', 'Mất trật tự trong giờ học', 'Làm việc riêng trong giờ học', 'Không ghi chép bài', 'Không trực nhật', 'Ăn quà vặt'],
  'Không nộp điện thoại hoặc sử dụng điện thoại trái phép trong giờ học': ['Không nộp điện thoại', 'Sử dụng điện thoại trái phép trong giờ học'],
  'Trốn tiết, ngủ trong giờ, nghỉ học tự do hoặc không có lý do chính đáng': ['Trốn tiết', 'Ngủ trong giờ học', 'Nghỉ học không phép'],
  'Mua bán/sử dụng thuốc lá, thuốc lá điện tử, ma túy, chất gây nghiện hoặc chất cấm': ['Mua bán thuốc lá', 'Sử dụng thuốc lá', 'Mua bán thuốc lá điện tử', 'Sử dụng thuốc lá điện tử', 'Mua bán ma túy, chất gây nghiện hoặc chất cấm', 'Sử dụng ma túy, chất gây nghiện hoặc chất cấm'],
  'Làm hư hỏng tài sản nhà trường hoặc lấy cắp/tiêu thụ tài sản lấy cắp': ['Làm hư hỏng tài sản nhà trường', 'Lấy cắp tài sản', 'Tiêu thụ tài sản lấy cắp'],
  'Vô lễ hoặc xúc phạm cán bộ, giáo viên, nhân viên nhà trường': ['Vô lễ với cán bộ, giáo viên, nhân viên nhà trường', 'Xúc phạm cán bộ, giáo viên, nhân viên nhà trường'],
  'Gây gổ, đánh nhau, gây thương tích, tổ chức hoặc cổ vũ đánh nhau': ['Gây gổ', 'Đánh nhau', 'Gây thương tích', 'Tổ chức đánh nhau', 'Cổ vũ đánh nhau'],
  'Đưa người lạ vào trường gây rối hoặc đánh bạc': ['Đưa người lạ vào trường gây rối', 'Đánh bạc'],
  'Phát biểu tích cực hoặc đạt điểm kiểm tra miệng/15 phút từ 9 đến 10': ['Phát biểu tích cực', 'Đạt điểm kiểm tra miệng từ 9 đến 10', 'Đạt điểm kiểm tra 15 phút từ 9 đến 10'],
  'Gương người tốt việc tốt, giúp đỡ bạn': ['Gương người tốt việc tốt', 'Giúp đỡ bạn'],
};

export function getBehaviorSuggestions(categories: BehaviorCategory[], query: string) {
  const words = removeVietnameseAccents(query).split(/\s+/).filter(Boolean);
  return categories.flatMap(category => {
    const names = specificNames[category.name] || [category.name];
    return names.map(name => ({ category, name })).filter(({ name }) => {
      // Compound rules must match the specific choice, not another choice's keywords.
      const searchable = removeVietnameseAccents([name, category.code, ...(names.length === 1 ? category.keywords || [] : [])].join(' '));
      return words.every(word => searchable.includes(word));
    });
  });
}
