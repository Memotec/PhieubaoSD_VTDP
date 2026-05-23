import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';
import { sendGmail, toBase64, generateReportHtml } from '../lib/gmail';
import { DeviceReport } from '../types';
import { ArrowLeft, Printer, User, FileText, Building, Layers, Mail, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ReportSlipProps {
  record: DeviceReport;
  onBack: () => void;
  googleToken: string | null;
  setGoogleToken: (token: string | null) => void;
  onMarkPrinted?: (id: string) => void;
}

export default function ReportSlip({ record, onBack, googleToken, setGoogleToken, onMarkPrinted }: ReportSlipProps) {
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

  const formattedRecordDate = formatVietnameseDate(record.ngay_bao);
  const formattedSignDate = formatVietnameseDate(record.ngay_ky);

  // Send email via Gmail API and trigger print simultaneously
  const handleExportAndSendEmail = async () => {
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
      const subject = `[Phiếu Thiết Bị] ${record.ten_thiet_bi} - S/N: ${record.serial}`;
      const bodyHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
          <h2 style="color: #1d4ed8; font-size: 20px; font-weight: 800; margin-bottom: 6px; border-bottom: 2px solid #3b82f6; padding-bottom: 12px; text-transform: uppercase;">
             Thông Báo Có Phiếu Thiết Bị Mới
          </h2>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            Chào Ban Quản Trị,<br><br>
            Cán bộ nghiệp vụ <strong>${record.nguoi_bao}</strong> vừa tạo và thông báo một Phiếu sử dụng thiết bị kỹ thuật mới chính thức trên hệ thống. Chi tiết tóm tắt bên dưới:
          </p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px; font-weight: bold; width: 180px; border: 1px solid #e2e8f0;">Người báo cáo:</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">${record.nguoi_bao}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Người nhận:</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${record.nguoi_nhan || 'N/A'}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Tên thiết bị:</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #1e3a8a;">${record.ten_thiet_bi}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Mã kho lưu:</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; color: #4338ca;">${record.ma_kho}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Số Serial (S/N):</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; color: #1d4ed8;">${record.serial}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Mã tài sản:</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${record.ma_tai_san || 'Chưa cập nhật'}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Mục đích bàn giao:</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; color: #334155;">${record.muc_dich}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Ngày ký phiếu:</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${record.ngay_ky}</td>
            </tr>
          </table>

          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px; border-radius: 8px; font-size: 13px; color: #1e40af; margin-top: 15px;">
             <strong>Thiết kế Biểu mẫu (File đính kèm):</strong> Bản in tiêu chuẩn chính thức dùng ký tươi đóng dấu hỏa tốc đã được đính kèm trực tiếp dưới dạng tệp tin HTML <code>Phieu_Bao_${record.serial}.html</code> bên dưới. Bạn có thể mở trực tiếp tệp tin này trong bất kỳ trình duyệt nào để in ấn hoặc nộp báo cáo giấy.
          </div>

          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 15px;">
            Hệ thống Đồng bộ hóa Thiết bị Kỹ thuật Quốc gia v2.5 - Đội Thông Tin. Trực tuyến Bảo mật.
          </p>
        </div>
      `;

      // 3. Generate HTML file content for attachment and Base64 encode it
      const attachmentHtml = generateReportHtml(record);
      const attachmentContent = toBase64(attachmentHtml);
      const attachmentFilename = `Phieu_Bao_${record.serial}_${record.ngay_bao}.html`;

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
      if (onMarkPrinted) {
        onMarkPrinted(record.id);
      }

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
    <div className="space-y-6" id="report-slip-pane">
      {/* Nút tác vụ */}
      <div className="no-print flex flex-col md:flex-row justify-between items-stretch md:items-center bg-white p-4.5 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm gap-4">
        <button
          onClick={onBack}
          id="slip-back-btn"
          className="w-full md:w-auto px-4.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 outline-none rounded-xl text-xs font-bold border border-slate-200 shadow-sm transition-all flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          Quay lại kho lưu trữ
        </button>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Email + Export simultaneously button */}
          <button
            onClick={handleExportAndSendEmail}
            disabled={sendingEmail}
            id="slip-send-mail-btn"
            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 transition-all flex items-center justify-center gap-2"
            title="Xuất phiếu bản in và đồng thời tự động gửi email thông báo kèm tệp gốc tới tailieutbtt@gmail.com"
          >
            {sendingEmail ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mail className="w-4 h-4" />
            )}
            Xuất Phiếu & Gửi Mail Báo Cáo
          </button>

          <button
            onClick={() => {
              window.print();
              if (onMarkPrinted) {
                onMarkPrinted(record.id);
              }
            }}
            id="slip-print-btn"
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/10 transition-all flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            In Phiếu Trực Tiếp
          </button>
        </div>
      </div>

      {/* Real-time Email Sending Feedback Alert Box */}
      {emailSuccess && (
        <div className="no-print p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 text-emerald-800 text-xs animate-fade-in" id="email-success-banner">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold text-slate-900 text-sm">Gửi báo cáo Email thành công!</p>
            <p className="mt-1 leading-relaxed text-slate-600">
              Hệ thống đã mã hóa và gửi thành công phiếu báo thiết bị (S/N: <strong className="font-mono text-indigo-700">{record.serial}</strong>) cùng tệp biểu mẫu bản in đính kèm tới địa chỉ <strong className="text-emerald-700 underline font-semibold">tailieutbtt@gmail.com</strong> qua Gmail.
            </p>
          </div>
        </div>
      )}

      {emailError && (
        <div className="no-print p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-800 text-xs animate-fade-in" id="email-error-banner">
          <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
          <div className="flex-grow">
            <p className="font-extrabold text-slate-950 text-sm">Gửi báo cáo qua Gmail không thành công</p>
            <p className="mt-1 leading-relaxed text-slate-500">
              Lỗi: {emailError}
            </p>
            <p className="mt-2 text-[10px] text-slate-400">
              *Mẹo: Đảm bảo bạn kết nối bằng Tài khoản Google có quyền truy cập Gmail để thực hiện tác vụ này. Cổng xác thực của bạn có thể đã hết hạn hoặc chưa được cấp quyền Gmail Send.
            </p>
            <button
              onClick={() => {
                setGoogleToken(null);
                handleExportAndSendEmail();
              }}
              className="mt-3 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[10px] transition-all"
            >
              Liên kết lại tài khoản Google & Gửi lại
            </button>
          </div>
        </div>
      )}

      {/* Tờ Phiếu Báo Gốc Đạt Chất Lượng Nghiệp Vụ Giấy Tờ */}
      <div className="bg-white px-8 sm:px-14 py-12 rounded-2xl shadow-md border border-slate-300 max-w-3xl mx-auto print-area font-serif text-slate-900 relative">
        {/* Bản trang trí góc trái dạng mờ - chỉ hiển thị trên màn hình */}
        <div className="no-print absolute top-3 right-3 text-[10px] text-slate-400 font-sans font-medium tracking-wide border border-slate-200 px-2 py-0.5 rounded-full select-none">
          Bản in gốc (Văn bản số)
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

        {/* Chữ ký phê duyệt gốc */}
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
    </div>
  );
}
