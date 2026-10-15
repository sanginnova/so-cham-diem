import type { Student } from '../types';
import type { HomeroomInput, HomeroomRecord } from '../types/homeroom';
export const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
export function parseMoney(value: string): number {
  if (!/^(0|[1-9]\d{0,11})$/.test(value)) throw new Error('Số tiền phải là số nguyên không âm, tối đa 12 chữ số.');
  return Number(value);
}
export function collectionMembers(collection: HomeroomRecord): string[] {
  const ids = JSON.parse(collection.data.studentIds || '[]');
  if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string') || new Set(ids).size !== ids.length) throw new Error('Danh sách áp dụng khoản thu không hợp lệ.');
  return ids;
}
export function collectionRows(collection: HomeroomRecord, records: HomeroomRecord[], students: Student[]) {
  const base = parseMoney(collection.data.amount);
  let names: Record<string, string> = {};
  try { names = JSON.parse(collection.data.studentNames || '{}'); } catch { /* current roster remains available */ }
  return collectionMembers(collection).map(studentId => {
    const student = students.find(s => s.id === studentId);
    const allowance = records.filter(r => r.kind === 'allowance' && r.studentId === studentId && r.data.collectionId === collection.id).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id))[0];
    const excluded = allowance?.data.mode === 'Không áp dụng';
    const discount = allowance ? Math.min(base, parseMoney(allowance.data.amount)) : 0;
    const due = excluded ? 0 : Math.max(0, base - discount);
    const transactions = records.filter(r => r.kind === 'payment' && r.studentId === studentId && r.data.collectionId === collection.id);
    const paid = transactions.filter(r => r.data.state !== 'Đã hủy').reduce((sum, r) => sum + parseMoney(r.data.amount), 0);
    const remaining = Math.max(0, due - paid), excess = Math.max(0, paid - due);
    const status = excluded ? 'Không áp dụng' : excess > 0 ? 'Nộp dư' : due === 0 ? 'Miễn' : paid === 0 ? 'Chưa nộp' : remaining > 0 ? 'Nộp một phần' : 'Đã nộp';
    return { studentId, name: student?.fullName || names[studentId] || studentId, code: student?.studentCode || '', base, discount: excluded ? base : discount, due, paid, remaining, excess, status, allowance, transactions };
  });
}
export function validateCollectionRecord(input: HomeroomInput, records: HomeroomRecord[], students: Student[]) {
  if (input.kind === 'collection') {
    if (!input.data.name?.trim()) throw new Error('Vui lòng nhập tên khoản thu.');
    parseMoney(input.data.amount);
    if (!['Đang thu', 'Đã kết thúc'].includes(input.data.status)) throw new Error('Trạng thái khoản thu không hợp lệ.');
    const ids = collectionMembers(input as HomeroomRecord);
    const old = records.find(r => r.id === input.id);
    if (old && (old.data.amount !== input.data.amount || old.data.studentIds !== input.data.studentIds)) throw new Error('Không đổi mức thu và danh sách áp dụng sau khi tạo. Dùng miễn/giảm cho từng học sinh.');
    if (!old && (!ids.length || ids.some(id => !students.some(s => s.id === id)))) throw new Error('Chọn ít nhất một học sinh trong lớp.');
    return;
  }
  if (!['payment', 'allowance'].includes(input.kind)) return;
  const collection = records.find(r => r.id === input.data.collectionId && r.kind === 'collection');
  if (!collection || !collectionMembers(collection).includes(input.studentId)) throw new Error('Học sinh không nằm trong danh sách áp dụng khoản thu.');
  if (collection.data.status !== 'Đang thu') throw new Error('Khoản thu đã kết thúc. Mở lại khoản thu trước khi ghi nhận.');
  const amount = parseMoney(input.data.amount);
  const old = records.find(r => r.id === input.id);
  if (old && old.data.collectionId !== input.data.collectionId) throw new Error('Không được chuyển khoản thu khi sửa.');
  if (input.kind === 'payment') {
    if (amount <= 0) throw new Error('Số tiền nộp phải lớn hơn 0.');
    if (!['Tiền mặt', 'Chuyển khoản', 'Khác'].includes(input.data.method)) throw new Error('Chọn phương thức thanh toán.');
    if (!old && input.data.state !== 'Đã ghi nhận') throw new Error('Trạng thái ghi nhận không hợp lệ.');
    if (old && (old.data.state === 'Đã hủy' || input.data.state !== 'Đã hủy' || !input.data.voidReason?.trim() || input.data.amount !== old.data.amount || input.data.method !== old.data.method || input.date !== old.date || input.data.note !== old.data.note)) throw new Error('Phiếu thu chỉ được hủy kèm lý do; không sửa số tiền đã ghi nhận.');
  } else {
    if (!['Giảm', 'Miễn', 'Không áp dụng', 'Bình thường'].includes(input.data.mode)) throw new Error('Chọn chế độ miễn/giảm.');
    if (amount > parseMoney(collection.data.amount)) throw new Error('Số tiền miễn/giảm không được lớn hơn mức thu.');
    if (input.data.mode === 'Miễn' && amount !== parseMoney(collection.data.amount)) throw new Error('Miễn toàn bộ phải bằng mức thu.');
    if (input.data.mode === 'Bình thường' && amount !== 0) throw new Error('Chế độ bình thường không có miễn/giảm.');
    if (input.data.mode !== 'Bình thường' && !input.data.reason?.trim()) throw new Error('Vui lòng nhập lý do miễn/giảm hoặc không áp dụng.');
  }
}
