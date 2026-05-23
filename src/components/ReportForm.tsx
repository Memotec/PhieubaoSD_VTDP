import { useState, ChangeEvent, FormEvent } from 'react';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Sparkles, Cloud, RefreshCw, Layers, Warehouse, FileText, User, Calendar } from 'lucide-react';

interface ReportFormProps {
  onSuccess: () => void;
  isOffline?: boolean;
}

export default function ReportForm({ onSuccess, isOffline }: ReportFormProps) {
  const [formData, setFormData] = useState({
    ngay_bao: new Date().toISOString().split('T')[0],
    nguoi_bao: '',
    nguoi_nhan: '',
    ten_thiet_bi: '',
    ma_kho: '',
    ma_tai_san: '',
    serial: '',
    muc_dich: '',
    ngay_ky: new Date().toISOString().split('T')[0],
  });

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  const fillSampleData = () => {
    setFormData({
      ngay_bao: '2025-05-13',
      nguoi_bao: 'Ngô Vi Ngoán',
      nguoi_nhan: 'Trần Văn Hoàng (Đội Trưởng)',
      ten_thiet_bi: 'Nguồn PSU / AC (Nguồn PSU của VSS frequency)',
      ma_kho: 'KHO-KTH-01A',
      ma_tai_san: 'VSS-FREQ-01',
      serial: 'H4082729',
      muc_dich: 'Thay thế bệ hỏng S/N: H4082719 đang phục vụ VSS frequency trực canh kỹ thuật.',
      ngay_ky: '2025-05-13',
    });
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (isOffline) {
      setSubmitting(true);
      const reportId = 'report_' + Date.now();
      try {
        const payload = {
          id: reportId,
          ngay_bao: formData.ngay_bao,
          nguoi_bao: formData.nguoi_bao,
          nguoi_nhan: formData.nguoi_nhan || '',
          ten_thiet_bi: formData.ten_thiet_bi,
          ma_kho: formData.ma_kho || 'CHƯA PHÂN KHO',
          ma_tai_san: formData.ma_tai_san || '',
          serial: formData.serial,
          muc_dich: formData.muc_dich,
          ngay_ky: formData.ngay_ky,
          creatorUid: 'offline_guest_user',
          createdAt: { seconds: Math.floor(Date.now() / 1000) },
        };

        const existingStr = localStorage.getItem('reports_offline_storage');
        const existingList = existingStr ? JSON.parse(existingStr) : [];
        existingList.unshift(payload);
        localStorage.setItem('reports_offline_storage', JSON.stringify(existingList));

        setSuccessMsg(true);
        // Reset form but preserve current date
        setFormData({
          ngay_bao: new Date().toISOString().split('T')[0],
          nguoi_bao: '',
          nguoi_nhan: '',
          ten_thiet_bi: '',
          ma_kho: '',
          ma_tai_san: '',
          serial: '',
          muc_dich: '',
          ngay_ky: new Date().toISOString().split('T')[0],
        });

        setTimeout(() => setSuccessMsg(false), 4500);
        onSuccess();
      } catch (err) {
        console.error(err);
        alert('Lỗi khi ghi dữ liệu Offline: ' + String(err));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!auth.currentUser) {
      alert('Vui lòng đăng nhập để lưu trữ thông tin lên Google Cloud!');
      return;
    }

    setSubmitting(true);
    const reportId = 'report_' + Date.now();
    const reportsCollection = 'reports';

    try {
      const docRef = doc(db, reportsCollection, reportId);
      const payload = {
        ngay_bao: formData.ngay_bao,
        nguoi_bao: formData.nguoi_bao,
        nguoi_nhan: formData.nguoi_nhan || '',
        ten_thiet_bi: formData.ten_thiet_bi,
        ma_kho: formData.ma_kho || 'CHƯA PHÂN KHO',
        ma_tai_san: formData.ma_tai_san || '',
        serial: formData.serial,
        muc_dich: formData.muc_dich,
        ngay_ky: formData.ngay_ky,
        creatorUid: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      };

      await setDoc(docRef, payload);

      setSuccessMsg(true);
      // Reset form but preserve current date
      setFormData({
        ngay_bao: new Date().toISOString().split('T')[0],
        nguoi_bao: '',
        nguoi_nhan: '',
        ten_thiet_bi: '',
        ma_kho: '',
        ma_tai_san: '',
        serial: '',
        muc_dich: '',
        ngay_ky: new Date().toISOString().split('T')[0],
      });

      setTimeout(() => setSuccessMsg(false), 4000);
      onSuccess();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${reportsCollection}/${reportId}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="report-form-pane">
      {/* Cột trái: Bảng hướng dẫn */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          {/* Accent decoration */}
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600" />
          
          <h3 className="font-bold text-slate-900 text-lg mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Hướng dẫn Số hóa
          </h3>
          <p className="text-slate-600 text-sm leading-relaxed mb-4">
            Bản ghi phiếu báo được lưu trực tuyến trên Google Cloud Firestore ngay sau khi gửi, hỗ trợ quản lý, tìm kiếm tập trung và in ấn lập tức.
          </p>
          
          <div className="space-y-3.5 mt-5">
            <div className="flex gap-2.5 items-start text-xs text-slate-500">
              <span className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 font-bold flex items-center justify-center flex-shrink-0">1</span>
              <p>
                <strong className="text-slate-800 block">Thêm trường Mã kho:</strong> Giúp bộ phận quản lý phân loại thiết bị cơ sở theo phân khu kho chính xác (ví dụ: Kho Kỹ thuật, Kho Thiết bị dự phòng).
              </p>
            </div>
            <div className="flex gap-2.5 items-start text-xs text-slate-500">
              <span className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 font-bold flex items-center justify-center flex-shrink-0">2</span>
              <p>
                <strong className="text-slate-800 block">Số Serial (S/N):</strong> Chuỗi số quản lý định danh của linh kiện chính xác nhằm đối chiếu khi lắp đặt thay thế.
              </p>
            </div>
            <div className="flex gap-2.5 items-start text-xs text-slate-500">
              <span className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 font-bold flex items-center justify-center flex-shrink-0">3</span>
              <p>
                <strong className="text-slate-800 block">Ngày tháng:</strong> Lựa chọn ngày thông báo và ngày ký để cấu hình biểu mẫu chuẩn mực nhất khi xuất in.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fillSampleData}
            id="fill-sample-btn"
            className="w-full mt-8 py-3 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold rounded-xl text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-sm"
          >
            <RefreshCw className="w-4 h-4 animate-spin-slow" />
            Mẫu Phiếu Gốc Viết Tay
          </button>
        </div>

        {/* Database state indicator */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-inner relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Warehouse className="w-24 h-24" />
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isOffline ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
            <span className="text-xs text-slate-400 font-medium">
              {isOffline ? 'Offline Storage Activated' : 'Google Cloud Server Online'}
            </span>
          </div>
          <h4 className="text-base font-bold mt-2 font-mono">
            {isOffline ? 'Offline Sandbox Mode' : 'Real-time Cloud Node'}
          </h4>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            {isOffline 
              ? 'Dữ liệu đang được ghi trực tiếp vào LocalStorage trình duyệt của bạn một cách an toàn và nhanh chóng mà không cần kết nối tới máy chủ Google.'
              : 'Dữ liệu trực tiếp đồng bộ thời gian thực. Bất kỳ sự thay đổi nào từ kho lưu trữ sẽ được cập nhật lập tức sang các thiết bị khác.'
            }
          </p>
        </div>
      </div>

      {/* Cột phải: Form thực tế */}
      <div className="lg:col-span-8">
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-sm flex items-start gap-3 shadow-sm animate-fade-in" id="success-feedback">
            <div className="p-1 px-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold font-mono">OK</div>
            <div>
              <p className="font-bold">{isOffline ? 'Đã ghi nhớ Offline!' : 'Đồng bộ Cloud thành công!'}</p>
              <p className="text-xs mt-0.5 opacity-90">
                {isOffline 
                  ? 'Phiếu của bạn đã được lưu an toàn trên Trình duyệt này. Xem tại tab "Kho Phiếu Cloud".' 
                  : 'Phiếu của bạn đã được kết nối và ghi lại trực tuyến tại Google Firestore. Xem tại tab "Kho Phiếu Cloud".'
                }
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-md space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-extrabold text-slate-950 tracking-tight flex items-center gap-2">
              <FileText className="w-5.5 h-5.5 text-blue-600" />
              Tạo mới Phiếu báo Thiết bị
            </h2>
            <p className="text-xs text-slate-500 mt-1">Cung cấp chính xác thông tin nội bộ cho Đội Thông Tin.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-50 gap-y-5">
            {/* Ngày báo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Ngày báo cáo *
              </label>
              <input
                type="date"
                name="ngay_bao"
                value={formData.ngay_bao}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm font-sans"
              />
            </div>

            {/* Ngày ký */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Ngày ký xác nhận *
              </label>
              <input
                type="date"
                name="ngay_ky"
                value={formData.ngay_ky}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm font-sans"
              />
            </div>

            {/* Người báo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Người báo sử dụng (Bàn giao) *
              </label>
              <input
                type="text"
                name="nguoi_bao"
                value={formData.nguoi_bao}
                onChange={handleChange}
                required
                placeholder="Nhập họ tên đầy đủ..."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm font-sans"
              />
            </div>

            {/* Người nhận */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Người nhận bàn giao
              </label>
              <input
                type="text"
                name="nguoi_nhan"
                value={formData.nguoi_nhan}
                onChange={handleChange}
                placeholder="Họ tên người nhận (nếu có)..."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm font-sans"
              />
            </div>

            {/* Tên thiết bị */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Tên thiết bị linh kiện bàn giao *
              </label>
              <input
                type="text"
                name="ten_thiet_bi"
                value={formData.ten_thiet_bi}
                onChange={handleChange}
                required
                placeholder="Ví dụ: Nguồn PSU / AC (VSS frequency)..."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm font-sans"
              />
            </div>

            {/* MÃ KHO (Yêu cầu thêm mục mã kho của người dùng) */}
            <div>
              <label className="block text-xs font-bold text-indigo-800 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Warehouse className="w-3.5 h-3.5 text-indigo-500" />
                Phân khu Mã kho *
              </label>
              <input
                type="text"
                name="ma_kho"
                value={formData.ma_kho}
                onChange={handleChange}
                required
                placeholder="Ví dụ: KHO-KTH-01A, KHO-THIET-BI..."
                className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-505 bg-indigo-50/20 text-sm font-sans font-semibold uppercase placeholder:normal-case"
              />
            </div>

            {/* Mã tài sản */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                Mã tài sản quản lý
              </label>
              <input
                type="text"
                name="ma_tai_san"
                value={formData.ma_tai_san}
                onChange={handleChange}
                placeholder="Ví dụ: VSS-FREQ-01..."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm font-sans"
              />
            </div>

            {/* Serial Number */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                Số Serial (S/N) *
              </label>
              <input
                type="text"
                name="serial"
                value={formData.serial}
                onChange={handleChange}
                required
                placeholder="Ví dụ: H4082729..."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm font-mono font-bold tracking-wider"
              />
            </div>

            {/* Mục đích */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Mục đích sử dụng / Nội dung bàn giao *
              </label>
              <textarea
                name="muc_dich"
                value={formData.muc_dich}
                onChange={handleChange}
                required
                rows={3}
                placeholder="Ghi rõ lý do bàn giao lấy s/n bệ hỏng thay thế..."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm font-sans"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={() =>
                setFormData({
                  ngay_bao: new Date().toISOString().split('T')[0],
                  nguoi_bao: '',
                  nguoi_nhan: '',
                  ten_thiet_bi: '',
                  ma_kho: '',
                  ma_tai_san: '',
                  serial: '',
                  muc_dich: '',
                  ngay_ky: new Date().toISOString().split('T')[0],
                })
              }
              className="px-5 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold rounded-xl text-sm transition-all"
            >
              Làm mới form
            </button>

            <button
              type="submit"
              disabled={submitting}
              id="submit-report-btn"
              className={`px-8 py-2.5 font-semibold rounded-xl text-sm shadow-md transition-all flex items-center gap-2 ${
                isOffline ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white' : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white'
              }`}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isOffline ? 'Đang lưu Offline...' : 'Đang đồng bộ Cloud...'}
                </>
              ) : (
                <>
                  <Cloud className="w-4.5 h-4.5" />
                  {isOffline ? 'Lưu Offline Trình Duyệt' : 'Lưu lên hệ thống Google'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
