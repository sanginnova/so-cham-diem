with open('src/components/HomeroomBookExportModal.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update imports
old_imp = """  Loader2,
  ShieldCheck,
} from 'lucide-react';"""

new_imp = """  Loader2,
  ShieldCheck,
  Save,
  Check,
} from 'lucide-react';"""

if old_imp in code:
    code = code.replace(old_imp, new_imp)
    print("Step 1 OK: Save, Check added to imports")
else:
    print("Step 1 failed: old_imp not found")

# 2. Add saveToast state and handleSaveDraft function
old_state = """  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);"""

new_state = """  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const handleSaveDraft = () => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        teacherName,
        approverName,
        classPresident,
        academicVicePresident,
        disciplineVicePresident,
        parentHead,
        parentPhone,
        notes,
        department,
        schoolName,
        updatedAt: new Date().toISOString()
      }));
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2500);
    } catch (err: any) {
      alert('Không thể lưu vào bộ nhớ trình duyệt: ' + (err.message || String(err)));
    }
  };"""

if old_state in code:
    code = code.replace(old_state, new_state)
    print("Step 2 OK: saveToast and handleSaveDraft added")
else:
    print("Step 2 failed: old_state not found")

# 3. Add Save Banner inside Tab 'notes'
old_tab_notes = """          {activeTab === 'notes' && (
            <div className="space-y-4">"""

new_tab_notes = """          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs">
                <span className="text-blue-900 dark:text-blue-200 font-medium">
                  💡 Thầy/Cô có thể ghi chép kế hoạch và bấm <strong>Lưu nội dung</strong> để hệ thống ghi nhớ cho các lần mở sổ và xuất Word tiếp theo.
                </span>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs ml-2"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saveToast ? 'Đã lưu!' : 'Lưu ngay'}</span>
                </button>
              </div>"""

if old_tab_notes in code:
    code = code.replace(old_tab_notes, new_tab_notes)
    print("Step 3 OK: Save banner in tab notes added")
else:
    print("Step 3 failed: old_tab_notes not found")

# 4. Add Save button to footer
old_footer = """          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Đóng
            </button>
            <button
              onClick={handleExport}"""

new_footer = """          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md transition flex items-center gap-1.5 cursor-pointer"
              title="Lưu lại toàn bộ nội dung đã nhập vào thiết bị"
            >
              <Save className="w-4 h-4" />
              <span>{saveToast ? 'Đã lưu!' : 'Lưu nội dung'}</span>
            </button>
            <button
              onClick={handleExport}"""

if old_footer in code:
    code = code.replace(old_footer, new_footer)
    print("Step 4 OK: Save button added to footer")
else:
    print("Step 4 failed: old_footer not found")

# Also update footer status display to show saveToast
old_status = """            {exportSuccess ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" /> Đã tải Sổ Chủ Nhiệm thành công!
              </span>
            ) : (
              <span>Định dạng Word (.docx) chuẩn OpenXML, chỉnh sửa trực tiếp 100%</span>
            )}"""

new_status = """            {exportSuccess ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" /> Đã tải Sổ Chủ Nhiệm thành công!
              </span>
            ) : saveToast ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" /> Đã lưu nội dung sổ thành công!
              </span>
            ) : (
              <span>Định dạng Word (.docx) chuẩn OpenXML, chỉnh sửa trực tiếp 100%</span>
            )}"""

if old_status in code:
    code = code.replace(old_status, new_status)
    print("Step 5 OK: Status updated for saveToast")
else:
    print("Step 5 failed: old_status not found")

with open('src/components/HomeroomBookExportModal.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("ALL DONE!")
