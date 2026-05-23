import { signInAnonymously, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { useState } from 'react';
import { Database, ShieldAlert, Sparkles } from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: (mockUser?: any) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLocalBypass = () => {
    onAuthSuccess({
      uid: 'offline_guest_user',
      displayName: 'Cán bộ Khách (Offline)',
      email: 'offline_guest@thongtin.gov',
      isOffline: true,
      isAnonymous: true
    });
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInAnonymously(auth);
      onAuthSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.code === 'auth/admin-restricted-operation' 
        ? 'Tính năng Đăng nhập ẩn danh chưa được bật trong Firebase Auth Console. Vui lòng bấm "Dùng không cần đồng bộ" ở dưới.'
        : 'Không thể kết nối ẩn danh với Cloud: ' + (err.message || String(err))
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onAuthSuccess();
    } catch (err: any) {
      console.error(err);
      // Fallback or warning
      setError('Lỗi đăng nhập Google: ' + (err.message || 'Vui lòng kiểm tra cấu hình dự án hoặc dùng chế độ khách'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-screen" className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-50 font-sans text-slate-800">
      {/* Cột trái: Giới thiệu hệ thống và hình ảnh */}
      <div className="lg:col-span-7 bg-slate-900 flex flex-col justify-between p-8 lg:p-16 text-white relative overflow-hidden">
        {/* Decorative Grid SVG Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 rounded-xl text-white">
            <Database className="w-6 h-6" id="header-db-icon" />
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight tracking-wide uppercase font-sans">
              Thời Gian Thực
            </h2>
            <p className="text-xs text-slate-400">TT Bảo Đảm Kỹ Thuật - Đội Thông Tin</p>
          </div>
        </div>

        <div className="relative z-10 my-auto py-12 lg:py-0 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold mb-6 border border-blue-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hệ thống số hóa phiếu báo v2.5</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-none mb-6">
            Số Hóa & Quản Lý <br />
            <span className="text-blue-500">Phiếu Báo Thiết Bị</span>
          </h1>
          <p className="text-slate-300 text-base leading-relaxed">
            Hệ thống tối ưu lưu trữ đám mây, cho phép điền nhanh thông tin sử dụng, bàn giao tài sản, xác thực kho bãi trực tuyến và xuất biểu mẫu in ấn tức thì đạt chuẩn mực nghiệp vụ kỹ thuật.
          </p>
          
          {/* Bento Features inside Login Screen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <span className="text-xs font-bold text-blue-400 uppercase">01 / Bảo mật google</span>
              <p className="text-xs text-slate-400 mt-1">Lưu trữ dữ liệu đồng bộ an toàn trên hệ thống máy chủ Cloud Firestore.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <span className="text-xs font-bold text-emerald-400 uppercase">02 / Xuất biểu mẫu</span>
              <p className="text-xs text-slate-400 mt-1">Xuất biểu mẫu dạng văn bản giấy để in trực tiếp hoặc tải danh sách dữ liệu CSV.</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-500 mt-8">
          © 2026 TRUNG TÂM BẢO ĐẢM KỸ THUẬT. Bảo lưu mọi quyền ứng dụng kỹ thuật và quy trình.
        </div>
      </div>

      {/* Cột phải: Khối Đăng nhập */}
      <div className="lg:col-span-5 flex items-center justify-center p-8 lg:p-12 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Bắt đầu kiểm soát dữ liệu
            </h2>
            <p className="text-sm text-slate-500 mt-1.5">
              Đăng nhập bằng tài khoản để bắt đầu đồng bộ hoặc chỉnh sửa phiếu thông tin thiết bị.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex gap-3 text-red-700 text-sm">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Lỗi xác thực</p>
                <p className="text-xs mt-0.5 opacity-90">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Google Authentication */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              id="google-login-btn"
              className="w-full flex items-center justify-center gap-3 px-5 py-3.5 border border-slate-200 hover:border-slate-300 rounded-xl font-semibold text-slate-800 hover:bg-slate-50 transition-all shadow-sm duration-150 text-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                />
              </svg>
              Đăng nhập bằng Google
            </button>

            <div className="flex items-center gap-3 py-2">
              <hr className="flex-grow border-slate-200" />
              <span className="text-xs font-semibold text-slate-400 uppercase">Hoặc</span>
              <hr className="flex-grow border-slate-200" />
            </div>

            {/* Quick Guest Access / Anonymous Auth */}
            <button
              onClick={handleGuestLogin}
              disabled={loading}
              id="guest-login-btn"
              className="w-full py-3.5 px-5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-semibold shadow-sm text-sm transition-colors duration-150 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Trải nghiệm chế độ Khách (Ẩn danh)</>
              )}
            </button>

            {/* Manual Local Bypass */}
            <button
              onClick={handleLocalBypass}
              type="button"
              id="bypass-offline-btn"
              className="w-full py-3.5 px-5 border border-indigo-200 text-indigo-700 hover:bg-indigo-50/50 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
            >
              Dùng không cần đồng bộ (Offline / Local Storage)
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-slate-400">
              Chế độ Khách lưu trữ dữ liệu hoàn toàn đồng bộ, hỗ trợ thử nghiệm trực tiếp không qua điền mật khẩu.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
