import React, { useState, useMemo } from 'react';
import {
  ClipboardCheck,
  X,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
  Trash2,
} from 'lucide-react';
import { Student } from '../../types';

interface QuickPasteStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  onImport: (
    studentsToImport: Array<Omit<Student, 'id' | 'createdAt' | 'updatedAt' | 'teacherId' | 'classId'>>,
    onDuplicate: 'update' | 'skip'
  ) => Promise<{ imported: number; updated: number }>;
}

export const QuickPasteStudentModal: React.FC<QuickPasteStudentModalProps> = ({
  isOpen,
  onClose,
  className,
  onImport,
}) => {
  const [rawText, setRawText] = useState('');
  const [prefixCode, setPrefixCode] = useState(() => className.replace(/[^a-zA-Z0-9]/g, '') || 'HS');
  const [defaultGender, setDefaultGender] = useState<'Nam' | 'Nữ' | 'none'>('none');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Tự động phân tích từng dòng text thành danh sách học sinh
  const parsedStudents = useMemo(() => {
    if (!rawText.trim()) return [];

    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const result: Array<{
      index: number;
      code: string;
      fullName: string;
      lastName: string;
      firstName: string;
      gender?: 'Nam' | 'Nữ';
      dateOfBirth?: string;
    }> = [];

    lines.forEach((line, idx) => {
      // 1. Nếu dòng là bảng có dấu tab (từ Excel copy sang)
      if (line.includes('\t')) {
        const parts = line.split('\t').map((p) => p.trim()).filter(Boolean);
        // Tìm phần tử giống họ tên nhất (chứa ít nhất 2 từ hoặc không phải số)
        let nameCandidate = '';
        let codeCandidate = '';
        let genderCandidate: 'Nam' | 'Nữ' | undefined;
        let dobCandidate = '';

        for (const p of parts) {
          // Kiểm tra giới tính
          if (p.toLowerCase() === 'nam') genderCandidate = 'Nam';
          else if (p.toLowerCase() === 'nữ' || p.toLowerCase() === 'nu') genderCandidate = 'Nữ';
          // Kiểm tra ngày sinh (dd/mm/yyyy hoặc yyyy-mm-dd)
          else if (/^\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4}$/.test(p)) dobCandidate = p;
          // Kiểm tra mã HS (có chữ và số, không khoảng trắng)
          else if (/^[A-Za-z0-9_-]{3,15}$/.test(p) && !codeCandidate) codeCandidate = p;
          // Phần còn lại ưu tiên làm họ tên
          else if (!nameCandidate && isNaN(Number(p))) nameCandidate = p;
        }

        // Bỏ số thứ tự ở đầu tên nếu có (vd "1. Nguyễn Văn A")
        nameCandidate = (nameCandidate || parts[0] || '').replace(/^\d+[\.\/\-\s]+/, '').trim();
        if (!nameCandidate) return;

        const nameTokens = nameCandidate.split(/\s+/);
        const firstName = nameTokens.pop() || '';
        const lastName = nameTokens.join(' ');
        const finalCode = codeCandidate || `${prefixCode}-${String(idx + 1).padStart(2, '0')}`;

        result.push({
          index: idx + 1,
          code: finalCode,
          fullName: nameCandidate,
          lastName,
          firstName,
          gender: genderCandidate || (defaultGender !== 'none' ? defaultGender : undefined),
          dateOfBirth: dobCandidate,
        });
        return;
      }

      // 2. Nếu dòng là văn bản thuần (vd "1. Nguyễn Văn An" hoặc "Nguyễn Văn An")
      // Xóa số thứ tự ở đầu (vd: "1. ", "01/ ", "1 - ")
      const cleanLine = line.replace(/^\d+[\.\/\-\)\s]+/, '').trim();
      if (!cleanLine || cleanLine.length < 2) return;

      const nameTokens = cleanLine.split(/\s+/);
      const firstName = nameTokens.pop() || '';
      const lastName = nameTokens.join(' ');
      const finalCode = `${prefixCode}-${String(idx + 1).padStart(2, '0')}`;

      result.push({
        index: idx + 1,
        code: finalCode,
        fullName: cleanLine,
        lastName,
        firstName,
        gender: defaultGender !== 'none' ? defaultGender : undefined,
      });
    });

    return result;
  }, [rawText, prefixCode, defaultGender]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (parsedStudents.length === 0) {
      setErrorMsg('Vui lòng dán danh sách học sinh vào ô bên dưới.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const payload: Array<Omit<Student, 'id' | 'createdAt' | 'updatedAt' | 'teacherId' | 'classId'>> =
        parsedStudents.map((s) => ({
          studentCode: s.code,
          fullName: s.fullName,
          lastName: s.lastName,
          firstName: s.firstName,
          gender: s.gender,
          dateOfBirth: s.dateOfBirth,
          status: 'active',
        }));

      await onImport(payload, 'update');
      onClose();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs">
      <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-slate-850 dark:to-slate-850">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                Dán nhanh danh sách học sinh
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lớp <strong className="text-blue-600 dark:text-blue-400">{className}</strong> · Copy cột họ tên từ Word, Zalo, Excel rồi dán vào đây
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* Cài đặt mã tiền tố & giới tính */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tiền tố mã học sinh tự sinh:
              </label>
              <input
                value={prefixCode}
                onChange={(e) => setPrefixCode(e.target.value.trim().toUpperCase())}
                placeholder="VD: 10A11, HS..."
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono font-bold text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400">Mã sẽ có dạng: {prefixCode}-01, {prefixCode}-02...</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Gán giới tính mặc định (nếu danh sách chưa có):
              </label>
              <select
                value={defaultGender}
                onChange={(e) => setDefaultGender(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-medium focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="none">Không xác định (cập nhật sau)</option>
                <option value="Nam">Tất cả là Nam</option>
                <option value="Nữ">Tất cả là Nữ</option>
              </select>
            </div>
          </div>

          {/* Ô dán văn bản */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Dán danh sách học sinh vào đây (mỗi dòng một học sinh):</span>
              </label>
              {rawText && (
                <button
                  type="button"
                  onClick={() => setRawText('')}
                  className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Xóa nội dung</span>
                </button>
              )}
            </div>

            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`Ví dụ dán dạng danh sách:\n1. Nguyễn Văn An\n2. Trần Thị Bình\n3. Lê Hoàng Cúc\n4. Đinh Tuấn Dũng\n\nHoặc dán cả hàng copy từ file Excel (STT, Mã, Tên, Ngày sinh)...`}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Bảng xem trước kết quả bóc tách */}
          {parsedStudents.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>
                    Đã nhận diện thành công: <strong className="text-emerald-600">{parsedStudents.length}</strong> học sinh
                  </span>
                </span>
                <span className="text-[11px] text-slate-400">Xem trước danh sách sẽ lưu:</span>
              </div>

              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 font-bold text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="p-2 w-10 text-center">STT</th>
                      <th className="p-2 w-24">Mã HS</th>
                      <th className="p-2">Họ và tên đệm</th>
                      <th className="p-2 w-20">Tên</th>
                      <th className="p-2 w-16 text-center">Giới tính</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {parsedStudents.map((s) => (
                      <tr key={s.index} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50">
                        <td className="p-2 text-center text-slate-400">{s.index}</td>
                        <td className="p-2 font-bold text-blue-600 dark:text-blue-400">{s.code}</td>
                        <td className="p-2 font-sans font-medium text-slate-800 dark:text-slate-200">
                          {s.lastName || '—'}
                        </td>
                        <td className="p-2 font-sans font-bold text-slate-900 dark:text-white">
                          {s.firstName}
                        </td>
                        <td className="p-2 text-center font-sans">
                          {s.gender ? (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                s.gender === 'Nam'
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                  : 'bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-300'
                              }`}
                            >
                              {s.gender}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <p className="text-[11px] text-slate-500">
            {parsedStudents.length > 0 ? (
              <span>Sẵn sàng lưu {parsedStudents.length} học sinh vào lớp {className}</span>
            ) : (
              <span>Dán danh sách để hệ thống nhận diện tự động</span>
            )}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-bold hover:bg-slate-100 transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={isSubmitting || parsedStudents.length === 0}
              onClick={handleSubmit}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-md shadow-blue-500/25 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Đang lưu…' : `Thêm vào lớp (${parsedStudents.length} học sinh)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
