import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';
import { sendGmail, toBase64, generateBatchReportHtml } from '../lib/gmail';
import { DeviceReport } from '../types';
import { ArrowLeft, Printer, User, FileText, Building, Layers, Mail, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface BatchReportSlipProps {
  records: DeviceReport[];
  onBack: () => void;
  googleToken: string | null;
  setGoogleToken: (token: string | null) => void;
}

export default function BatchReportSlip({ records, onBack, googleToken, setGoogleToken }: BatchReportSlipProps) {
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Helpers to parse Vietnamese Date representation from YYYY-MM-DD
  const formatVietnameseDate = (dateString: string) => {
    if (!dateString) return { day: '__', month: '__', year: '2026' };
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return { day: '__', month: '__', year: '2026' };
    return {
      day: d.getDate().toString().padStart(2, '0'),
      month: (d.getMonth() + 1).toString().padStart(2, '0'),
      year: d.getFullYear(),
    };
  };

  // Send batch emails via Gmail API and trigger print simultaneously
  const handleExportAndSendEmailBatch = async () => {
    setSendingEmail(true);
    setEmailSuccess(false);
    setEmailError(null);

    try {
      let activeToken = googleToken;

      // 1. If we don't have an active Google Token in-memory, sign in & request scopes pop-up
      if (!activeToken) {
        const provider = new GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/gmail.send');
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          activeToken = credential.accessToken;
          setGoogleToken(credential.accessToken);
        } else {
          throw new Error('Không lấy được Access Token kết hợp Gmail từ Google.');
        }
      }

      // 2. Generate email content
      const subject = `[Báo Cáo Gộp] Tổng hợp ${records.length} Phiếu Thiết Bị Kỹ Thuật`;
      const bodyHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
          <h2 style="color: #4f46e5; font-size: 20px; font-weight: 800; margin-bottom: 6px; border-bottom: 2px solid #818cf8; padding-bottom: 12px; text-transform: uppercase;">
             Báo Cáo Gộp Phiếu Thiết Bị (${records.length} Phiếu)
          </h2>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            Chào Ban Quản Trị,<br><br>
            Hệ thống kỹ thuật vừa tổng hợp báo cáo gộp gồm <strong>${records.length}</strong> phiếu báo sử dụng thiết bị từ các cán bộ nghiệp vụ trực tuyến. Chi tiết biên bản gộp:
          </p>
          
          <p style="font-size: 14px; font-weight: bold; margin-top: 20px; color: #1e293b; border-left: 3px solid #6366f1; padding-left: 8px;"> Danh sách các thiết bị trong gói báo cáo:</p>
          <ul style="font-size: 13px; line-height: 1.8; color: #334155; padding-left: 20px;">
            ${records.map((r, i) => `
              <li style="margin-bottom: 8px;">
                Phiếu #${i + 1}: <strong>${r.ten_thiet_bi}</strong><br>
                S/N: <code style="color:#2563eb; font-weight:bold; background-color: #eff6ff; padding: 2px 4px; border-radius: 4px;">${r.serial}</code> 
                | Kho: <span style="font-weight: bold;">${r.ma_kho}</span>
                | Người báo: <span>${r.nguoi_bao}</span>
              </li>
            `).join('')}
          </ul>

          <div style="background-color: #f5f3ff; border-left: 4px solid #818cf8; padding: 12px; border-radius: 8px; font-size: 13px; color: #4c1d95; margin-top: 20px;">
             <strong>Thiết kế Biểu mẫu (File đính kèm):</strong> Tệp in ấn chuẩn liên kết nhiều trang chứa toàn bộ các biểu mẫu thiết lập riêng lẻ được nén trong file HTML đính kèm <code>Bao_Cao_Gop_${records.length}_Phieu_${new Date().toISOString().split('T')[0]}.html</code> bên dưới. Mở trực tiếp trên trình duyệt để kích hoạt chế độ in song song nhiều trang rất nhanh chóng.
          </div>

          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 15px;">
            Hệ thống Đồng bộ hóa Thiết bị Kỹ thuật Quốc gia v2.5 - Đội Thông Tin. Trực tuyến Bảo mật.
          </p>
        </div>
      `;

      // 3. Generate HTML file content for attachment and Base64 encode it
      const attachmentHtml = generateBatchReportHtml(records);
      const attachmentContent = toBase64(attachmentHtml);
      const attachmentFilename = `Bao_Cao_Gop_${records.length}_Phieu_${new Date().toISOString().split('T')[0]}.html`;

      // 4. Send email targeting tailieutbtt@gmail.com
      if (!activeToken) throw new Error('Yêu cầu mật khẩu token kết nối!');
      await sendGmail({
        accessToken: activeToken,
        to: 'tailieutbtt@gmail.com',
        subject,
        bodyHtml,
        attachmentFilename,
        attachmentContent,
        attachmentType: 'text/html'
      });

      setEmailSuccess(true);

      // Trigger standard print dialogue immediately after success to satisfy "xuất phiếu đồng thời"
      setTimeout(() => {
        window.print();
      }, 800);

    } catch (err: any) {
      console.error(err);
      setEmailError(err.message || String(err));
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6" id="batch-report-slip-pane">
      {/* Nút tác vụ */}
      <div className="no-print flex flex-col md:flex-row justify-between items-stretch md:items-center bg-white p-4.5 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm gap-4">
        <button
          onClick={onBack}
          id="batch-slip-back-btn"
          className="w-full md:w-auto px-4.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 outline-none rounded-xl text-xs font-bold border border-slate-200 shadow-sm transition-all flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          Quay lại danh sách
        </button>

        <div className="text-xs text-slate-500 font-bold bg-slate-100/80 px-3 py-1.5 rounded-lg flex items-center justify-center">
          Trạng thái: Đang kẹp <span className="text-blue-600 font-extrabold mx-1">{records.length}</span> phiếu để xử trị báo cáo
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Email + Export simultaneously button - matches high fidelity */}
          <button
            onClick={handleExportAndSendEmailBatch}
            disabled={sendingEmail}
            id="batch-send-mail-btn"
            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 transition-all flex items-center justify-center gap-2"
            title="Xuất phiếu bản in gộp và đồng thời tự động gửi email thông báo kèm tệp gốc tới tailieutbtt@gmail.com"
          >
            {sendingEmail ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mail className="w-4 h-4" />
            )}
            Xuất Gộp & Gửi Mail Báo Cáo ({records.length})
          </button>

          <button
            onClick={() => window.print()}
            id="batch-slip-print-btn"
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/10 transition-all flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Lệnh In Gộp PDF ({records.length})
          </button>
        </div>
      </div>

      {/* Real-time Email Sending Feedback Alert Box */}
      {emailSuccess && (
        <div className="no-print p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 text-emerald-800 text-xs animate-fade-in" id="batch-email-success-banner">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold text-slate-900 text-sm">Gửi báo cáo gộp Email thành công!</p>
            <p className="mt-1 leading-relaxed text-slate-600">
              Hệ thống đã mã hóa và gửi thành công <strong className="font-bold underline text-indigo-700">{records.length} phiếu báo thiết bị</strong> đợt sinh và tệp gộp chính thức đính kèm tới địa chỉ <strong className="text-emerald-700 underline font-semibold">tailieutbtt@gmail.com</strong> qua hòm thư Gmail của cán bộ.
            </p>
          </div>
        </div>
      )}

      {emailError && (
        <div className="no-print p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-800 text-xs animate-fade-in" id="batch-email-error-banner">
          <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
          <div className="flex-grow">
            <p className="font-extrabold text-slate-950 text-sm">Gửi báo cáo gộp qua Gmail không thành công</p>
            <p className="mt-1 leading-relaxed text-slate-500">
              Lỗi: {emailError}
            </p>
            <p className="mt-2 text-[10px] text-slate-400">
              *Mẹo: Đảm bảo bạn kết nối bằng Tài khoản Google có quyền truy cập Gmail để thực hiện tác vụ này. Bạn có thể nhấn cập nhật/liên kết lại bên dưới để khởi tạo hoặc lấy quyền Gmail Send.
            </p>
            <button
              onClick={() => {
                setGoogleToken(null);
                handleExportAndSendEmailBatch();
              }}
              className="mt-3 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[10px] transition-all"
            >
              Liên kết lại tài khoản Google & Gửi lại
            </button>
          </div>
        </div>
      )}

      {/* Hiển thị lần lượt các phiếu báo */}
      <div className="space-y-8 print:space-y-0">
        {records.map((record, index) => {
          const formattedRecordDate = formatVietnameseDate(record.ngay_bao);
          const formattedSignDate = formatVietnameseDate(record.ngay_ky);

          return (
            <div 
              key={record.id} 
              className={`bg-white px-8 sm:px-14 py-12 rounded-2xl shadow-md border border-slate-300 max-w-3xl mx-auto print-area font-serif text-slate-900 relative print:shadow-none print:border-none print:p-0 print:mx-0 print:max-w-none ${
                index < records.length - 1 ? 'print-break-page mb-10 print:mb-0' : ''
              }`}
            >
              {/* Bản trang trí góc trái dạng mờ - chỉ hiển thị trên màn hình */}
              <div className="no-print absolute top-3 right-3 text-[10px] text-slate-400 font-sans font-medium tracking-wide border border-slate-200 px-2 py-0.5 rounded-full select-none">
                Phiếu số {index + 1} / {records.length}
              </div>

              {/* Header Quốc hiệu / Tiêu đề Đơn vị */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-black text-center sm:text-left">
                <div>
                  <h2 className="text-xs uppercase font-extrabold tracking-widest font-sans">
                    Trung Tâm Bảo Đảm Kỹ Thuật
                  </h2>
                  <h3 className="text-sm uppercase font-extrabold tracking-widest font-sans mt-0.5">
                    Đội Thông Tin
                  </h3>
                </div>
                <div className="sm:text-right flex flex-col sm:justify-end text-xs font-sans text-slate-500">
                  <div>
                    Ngày gửi Cloud:{' '}
                    {record.createdAt
                      ? new Date(record.createdAt.seconds * 1000).toLocaleString('vi-VN')
                      : 'Mới lưu'}
                  </div>
                </div>
              </div>

              {/* Tiêu đề chính */}
              <div className="text-center my-10">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-wider">
                  PHIẾU BÁO SỬ DỤNG THIẾT BỊ
                </h1>
                <p className="text-[10px] sm:text-xs text-slate-400 font-sans mt-1 uppercase tracking-widest">
                  REPORTING EQUIPMENT UTILIZATION SHEET
                </p>
              </div>

              {/* Thân Biểu Mẫu dạng Dòng Kẻ Chấm Viết Tay */}
              <div className="space-y-6 text-sm sm:text-base border-t border-slate-100 pt-6">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                  <span className="font-bold text-slate-800 min-w-[280px] font-sans flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400 no-print" />
                    Người báo Sử dụng <span className="text-xs font-normal text-slate-500">(bàn giao)</span>:
                  </span>
                  <span className="flex-grow dotted-line-input text-base sm:text-lg pl-2 h-7 leading-7">
                    {record.nguoi_bao}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                  <span className="font-bold text-slate-800 min-w-[280px] font-sans flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400 no-print" />
                    Người nhận bàn giao <span className="text-xs font-normal text-slate-500">(nếu có)</span>:
                  </span>
                  <span className="flex-grow dotted-line-input text-base sm:text-lg pl-2 h-7 leading-7">
                    {record.nguoi_nhan || '....................................................................'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                  <span className="font-bold text-slate-800 min-w-[280px] font-sans flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400 no-print" />
                    Tên thiết bị:
                  </span>
                  <span className="flex-grow dotted-line-input text-base sm:text-lg pl-2 h-7 leading-7 font-bold text-slate-950">
                    {record.ten_thiet_bi}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                  <span className="font-bold text-slate-800 min-w-[280px] font-sans flex items-center gap-2">
                    <Building className="w-4 h-4 text-slate-400 no-print" />
                    Mã kho:
                  </span>
                  <span className="flex-grow dotted-line-input text-base sm:text-lg pl-2 h-7 leading-7 text-indigo-900 font-semibold tracking-wide uppercase">
                    {record.ma_kho}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                  <span className="font-bold text-slate-800 min-w-[280px] font-sans flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-400 no-print" />
                    Mã tài sản:
                  </span>
                  <span className="flex-grow dotted-line-input text-base sm:text-lg pl-2 h-7 leading-7">
                    {record.ma_tai_san || '....................................................................'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                  <span className="font-bold text-slate-800 min-w-[280px] font-sans flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-400 no-print" />
                    Serial Number:
                  </span>
                  <span className="flex-grow dotted-line-input text-base sm:text-lg pl-2 h-7 leading-7 font-mono font-bold tracking-wider text-blue-900">
                    {record.serial}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                  <span className="font-bold text-slate-800 min-w-[280px] font-sans flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400 no-print" />
                    Mục đích sử dụng:
                  </span>
                  <span className="flex-grow dotted-line-input text-base sm:text-lg pl-2 h-7 leading-7">
                    {record.muc_dich}
                  </span>
                </div>
              </div>

              {/* Chứ ký phê duyệt gốc */}
              <div className="mt-14 flex flex-col items-end text-right">
                <div className="text-sm font-sans font-semibold text-slate-600 mb-2">
                  Ngày {formattedSignDate.day} tháng {formattedSignDate.month} năm {formattedSignDate.year}
                </div>
                <div className="mr-8 text-center min-w-[180px]">
                  <h4 className="font-sans font-extrabold text-slate-900 text-sm">Người báo sử dụng</h4>
                  <p className="text-[10px] text-slate-400 italic mt-0.5">(Ký và ghi rõ họ tên)</p>
                  <div className="h-20" />
                  <p className="font-serif italic font-semibold text-lg text-blue-900">
                    {record.nguoi_bao}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
