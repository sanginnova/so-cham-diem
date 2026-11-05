with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

error_boundary_code = """
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-2xl font-bold">
              ⚠️
            </div>
            <h2 className="text-lg font-bold text-white">Đã xảy ra lỗi hiển thị</h2>
            <p className="text-xs text-slate-400">
              {this.state.error?.message || 'Có lỗi phát sinh trong quá trình tải dữ liệu.'}
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                🔄 Tải lại trang
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.hash = '';
                }}
                className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
"""

old_app = """export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}"""

new_app = error_boundary_code + """
export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainApp />
      </AppProvider>
    </ErrorBoundary>
  );
}"""

if old_app in content:
    content = content.replace(old_app, new_app)
    with open('src/App.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('ErrorBoundary added to App.tsx successfully!')
else:
    print('Failed to find old_app in App.tsx')
