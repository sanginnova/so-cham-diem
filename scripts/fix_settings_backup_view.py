with open('src/components/SettingsBackupView.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update handleJsonFileSelected & handleConfirmRestore
old_funcs = """  const handleJsonFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed.students || !parsed.disciplineLogs) {
          alert('Tệp sao lưu không đúng định dạng của ứng dụng Sổ Chấm Điểm Hàng Ngày.');
          return;
        }

        setRestoreJsonString(text);
        setRestorePreview({
          exportedAt: parsed.exportedAt,
          className: parsed.classConfig?.className || classConfig.className,
          schoolYear: parsed.classConfig?.schoolYear || classConfig.schoolYear,
          teacher: parsed.classConfig?.homeroomTeacher || classConfig.homeroomTeacher,
          studentCount: parsed.students?.length || 0,
          logCount: parsed.disciplineLogs?.length || 0,
          categoryCount: parsed.behaviorCategories?.length || 0,
        });
      } catch (err: any) {
        alert('Lỗi định dạng tệp JSON: ' + (err.message || String(err)));
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async () => {
    if (!restoreJsonString) return;
    const res = await restoreFromJson(restoreJsonString);
    if (res.success) {
      alert(`Khôi phục thành công! Đã nạp ${res.studentCount} học sinh và ${res.logCount} bản ghi nhật ký.`);
      setRestorePreview(null);
      setRestoreJsonString('');
    } else {
      alert(res.message);
    }
  };"""

new_funcs = """  const handleJsonFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed.students && !parsed.disciplineLogs) {
          alert('Tệp sao lưu không đúng định dạng của ứng dụng Sổ Chấm Điểm Hàng Ngày (cần có danh sách students hoặc disciplineLogs).');
          return;
        }

        setRestoreJsonString(text);
        setRestorePreview({
          fileName: file.name,
          exportedAt: parsed.exportedAt,
          className: parsed.classConfig?.className || classConfig.className,
          schoolYear: parsed.classConfig?.schoolYear || classConfig.schoolYear,
          teacher: parsed.classConfig?.homeroomTeacher || classConfig.homeroomTeacher,
          studentCount: parsed.students?.length || 0,
          logCount: parsed.disciplineLogs?.length || 0,
          categoryCount: parsed.behaviorCategories?.length || 0,
        });
      } catch (err: any) {
        alert('Lỗi định dạng tệp JSON: ' + (err.message || String(err)));
      }
    };
    reader.readAsText(file);
    if (jsonFileInputRef.current) {
      jsonFileInputRef.current.value = '';
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreJsonString) return;
    setIsRestoring(true);
    try {
      const res = await restoreFromJson(restoreJsonString);
      if (res.success) {
        alert(`✅ Khôi phục thành công! Đã nạp ${res.studentCount} học sinh và ${res.logCount} bản ghi nhật ký vào lớp ${classConfig.className}.`);
        setRestorePreview(null);
        setRestoreJsonString('');
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert('Lỗi khôi phục: ' + (err.message || String(err)));
    } finally {
      setIsRestoring(false);
    }
  };"""

if old_funcs in code:
    code = code.replace(old_funcs, new_funcs)
    print("Step 1 OK: Functions updated")
else:
    print("Step 1 failed: old_funcs not found")

# 2. Update Tab 5 UI (Add Class switcher on top of Tab 5)
old_tab5 = """      {/* TAB 5: SAO LƯU & KHÔI PHỤC */}
      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Download className="h-4 w-4 text-emerald-600" />
              <span>Xuất Tệp Sao Lưu (.JSON)</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tải toàn bộ danh sách {students.length} học sinh, {disciplineLogs.length} bản ghi nhật ký, danh mục lỗi và quy chế điểm thưởng thành tích về máy tính an toàn.
            </p>
            <button
              onClick={handleExportJson}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
            >
              <Download className="h-4 w-4" />
              <span>Tải tệp sao lưu toàn bộ dữ liệu</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Upload className="h-4 w-4 text-blue-600" />
              <span>Khôi Phục Từ Tệp Sao Lưu (.JSON)</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Phục hồi dữ liệu từ bản sao lưu trước đó. Dữ liệu nạp vào sẽ đồng bộ lên đám mây nếu bạn đang đăng nhập.
            </p>
            <input
              type="file"
              accept=".json"
              ref={jsonFileInputRef}
              onChange={handleJsonFileSelected}
              className="hidden"
            />
            <button
              onClick={() => jsonFileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
            >
              <Upload className="h-4 w-4" />
              <span>Chọn tệp sao lưu JSON để nạp</span>
            </button>
          </div>"""

new_tab5 = """      {/* TAB 5: SAO LƯU & KHÔI PHỤC */}
      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          {/* Lớp đang thao tác & chuyển lớp nhanh */}
          <div className="md:col-span-2 p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-blue-600 text-white rounded-xl font-bold">🏫</span>
              <div>
                <span className="text-slate-500 block">Lớp đang chọn để Sao lưu & Khôi phục:</span>
                <span className="font-bold text-sm text-blue-900 dark:text-blue-100">
                  Lớp {classConfig.className} • Năm học {classConfig.schoolYear} ({students.length} học sinh, {disciplineLogs.length} bản ghi nhật ký)
                </span>
              </div>
            </div>
            {workspaceClasses && workspaceClasses.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">Đổi lớp:</span>
                <select
                  value={classConfig.id}
                  onChange={(e) => selectWorkspaceClass(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer shadow-xs"
                >
                  {workspaceClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      Lớp {cls.className} ({cls.schoolYear})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Download className="h-4 w-4 text-emerald-600" />
              <span>Xuất Tệp Sao Lưu (.JSON)</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tải toàn bộ danh sách {students.length} học sinh, {disciplineLogs.length} bản ghi nhật ký, danh mục lỗi và quy chế điểm thưởng thành tích của <strong>Lớp {classConfig.className}</strong> về máy tính an toàn.
            </p>
            <button
              onClick={handleExportJson}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Tải tệp sao lưu toàn bộ dữ liệu</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Upload className="h-4 w-4 text-blue-600" />
              <span>Khôi Phục Từ Tệp Sao Lưu (.JSON)</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Phục hồi dữ liệu từ bản sao lưu trước đó. Hệ thống sẽ hiển thị bảng đối chiếu thông tin để bạn kiểm tra trước khi nạp vào lớp.
            </p>
            <input
              type="file"
              accept=".json"
              ref={jsonFileInputRef}
              onChange={handleJsonFileSelected}
              className="hidden"
            />
            <button
              onClick={() => jsonFileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span>Chọn tệp sao lưu JSON để nạp</span>
            </button>
          </div>"""

if old_tab5 in code:
    code = code.replace(old_tab5, new_tab5)
    print("Step 2 OK: Tab 5 updated")
else:
    print("Step 2 failed: old_tab5 not found")

# 3. Add Modal for restorePreview
old_footer = """      {/* Thông tin phiên bản hệ thống */}"""

new_footer = """      {/* MODAL: XÁC NHẬN KHÔI PHỤC DỮ LIỆU TỪ TỆP SAO LƯU */}
      {restorePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="h-5 w-5 text-blue-600" />
                <span>Xác Nhận Khôi Phục Dữ Liệu</span>
              </h3>
              <button
                type="button"
                onClick={() => { setRestorePreview(null); setRestoreJsonString(''); }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/50 space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-blue-200/60 dark:border-blue-800/60">
                <span className="text-slate-500 font-medium">Tệp sao lưu:</span>
                <span className="font-mono font-bold text-blue-800 dark:text-blue-200">{restorePreview.fileName || 'backup.json'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-slate-500 block">Lớp nguồn:</span>
                  <strong className="text-slate-800 dark:text-slate-200 text-sm">Lớp {restorePreview.className}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Niên khóa:</span>
                  <strong className="text-slate-800 dark:text-slate-200 text-sm">{restorePreview.schoolYear}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">GVCN:</span>
                  <strong className="text-slate-800 dark:text-slate-200">{restorePreview.teacher}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Thời gian xuất:</span>
                  <strong className="text-slate-800 dark:text-slate-200">{restorePreview.exportedAt ? new Date(restorePreview.exportedAt).toLocaleString('vi-VN') : '—'}</strong>
                </div>
              </div>
            </div>

            {/* Thống kê dữ liệu trong bản sao lưu */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-750 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block text-[11px]">Học sinh</span>
                <strong className="text-base font-black text-blue-600 dark:text-blue-400">{restorePreview.studentCount}</strong>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-750 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block text-[11px]">Nhật ký / Điểm</span>
                <strong className="text-base font-black text-emerald-600 dark:text-emerald-400">{restorePreview.logCount}</strong>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-750 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block text-[11px]">Danh mục quy chế</span>
                <strong className="text-base font-black text-purple-600 dark:text-purple-400">{restorePreview.categoryCount}</strong>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                Dữ liệu sẽ được khôi phục vào <strong>Lớp {classConfig.className}</strong>. Các học sinh và nhật ký trùng khớp sẽ được cập nhật đồng bộ.
              </span>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                disabled={isRestoring}
                onClick={() => { setRestorePreview(null); setRestoreJsonString(''); }}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isRestoring}
                onClick={handleConfirmRestore}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                <span>{isRestoring ? 'Đang khôi phục dữ liệu...' : 'Xác nhận Nạp & Khôi Phục'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thông tin phiên bản hệ thống */}"""

if old_footer in code:
    code = code.replace(old_footer, new_footer)
    print("Step 3 OK: Modal added")
else:
    print("Step 3 failed: old_footer not found")

with open('src/components/SettingsBackupView.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("ALL DONE!")

