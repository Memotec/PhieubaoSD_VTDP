// Helper utilities for sending reports via Google Gmail API

export function toBase64(str: string): string {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  }));
}

export function toBase64Url(base64: string): string {
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function sendGmail({
  accessToken,
  to,
  subject,
  bodyHtml,
  attachmentFilename,
  attachmentContent, // base64 string
  attachmentType
}: {
  accessToken: string;
  to: string;
  subject: string;
  bodyHtml: string;
  attachmentFilename?: string;
  attachmentContent?: string;
  attachmentType?: string;
}) {
  const boundary = 'boundary_device_report_v25';
  const encodedSubject = `=?utf-8?B?${toBase64(subject)}?=`;

  const headers = [
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
  ];

  const partHtml = [
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    toBase64(bodyHtml),
    '',
  ];

  let partAttachment: string[] = [];
  if (attachmentFilename && attachmentContent) {
    partAttachment = [
      `--${boundary}`,
      `Content-Type: ${attachmentType || 'text/html'}; name="${attachmentFilename}"`,
      `Content-Disposition: attachment; filename="${attachmentFilename}"`,
      'Content-Transfer-Encoding: base64',
      '',
      attachmentContent,
      '',
    ];
  }

  const message = [
    ...headers,
    ...partHtml,
    ...partAttachment,
    `--${boundary}--`,
  ].join('\r\n');

  const raw = toBase64Url(toBase64(message));

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Lỗi Gmail API (Mã: ${response.status})`);
  }

  return await response.json();
}

/**
 * Generates a clean HTML representation of a single report for attachment
 */
export function generateReportHtml(record: any): string {
  const dateParts = record.ngay_bao ? record.ngay_bao.split('-') : ['2026', '05', '23'];
  const day = dateParts[2] || '23';
  const month = dateParts[1] || '05';
  const year = dateParts[0] || '2026';

  const signParts = record.ngay_ky ? record.ngay_ky.split('-') : [year, month, day];
  const sDay = signParts[2] || day;
  const sMonth = signParts[1] || month;
  const sYear = signParts[0] || year;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Phiếu Báo Sử Dụng Thiết Bị - ${record.serial}</title>
  <style>
    body {
      font-family: "Times New Roman", Times, Georgia, serif;
      padding: 40px;
      color: #0f172a;
      max-width: 750px;
      margin: 0 auto;
      line-height: 1.6;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2px solid #000;
      padding-bottom: 12px;
      margin-bottom: 30px;
    }
    .header-left {
      text-transform: uppercase;
      font-weight: bold;
      font-size: 11px;
      font-family: Arial, Helvetica, sans-serif;
      letter-spacing: 0.5px;
    }
    .header-right {
      text-align: right;
      font-size: 11px;
      font-family: Arial, Helvetica, sans-serif;
      color: #64748b;
    }
    .title-area {
      text-align: center;
      margin: 40px 0;
    }
    .title-primary {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 1px;
      margin: 0;
    }
    .title-sub {
      font-size: 11px;
      font-family: Arial, Helvetica, sans-serif;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-top: 4px;
    }
    .content-section {
      margin-top: 30px;
    }
    .row {
      display: table;
      width: 100%;
      margin-bottom: 18px;
    }
    .label {
      display: table-cell;
      font-weight: bold;
      font-family: Arial, Helvetica, sans-serif;
      width: 280px;
      font-size: 14px;
      color: #334155;
    }
    .value {
      display: table-cell;
      border-bottom: 1px dotted #94a3b8;
      padding-left: 8px;
      font-size: 15px;
    }
    .value-bold {
      font-weight: bold;
      color: #000;
    }
    .signature-area {
      margin-top: 60px;
      text-align: right;
    }
    .signature-date {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 13px;
      color: #475569;
      margin-bottom: 8px;
    }
    .signature-box {
      display: inline-block;
      min-width: 220px;
      text-align: center;
    }
    .signature-title {
      font-family: Arial, Helvetica, sans-serif;
      font-weight: bold;
      font-size: 13px;
    }
    .signature-sub {
      font-size: 11px;
      color: #64748b;
      font-style: italic;
    }
    .signature-name {
      margin-top: 70px;
      font-weight: bold;
      font-size: 16px;
    }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td class="header-left">
        Trung Tâm Bảo Đảm Kỹ Thuật<br>
        <span style="font-size: 13px;">Đội Thông Tin</span>
      </td>
      <td class="header-right">
        Hệ thống Số hóa Phiếu báo v2.5<br>
        Mã số phiếu: ${record.id}
      </td>
    </tr>
  </table>

  <div class="title-area">
    <h1 class="title-primary">PHIẾU BÁO SỬ DỤNG THIẾT BỊ</h1>
    <div class="title-sub">REPORTING EQUIPMENT UTILIZATION SHEET</div>
  </div>

  <div class="content-section">
    <div class="row">
      <div class="label">Người báo Sử dụng (bàn giao):</div>
      <div class="value value-bold">${record.nguoi_bao}</div>
    </div>
    
    <div class="row">
      <div class="label">Người nhận bàn giao (nếu có):</div>
      <div class="value">${record.nguoi_nhan || 'N/A'}</div>
    </div>

    <div class="row">
      <div class="label">Tên thiết bị:</div>
      <div class="value value-bold">${record.ten_thiet_bi}</div>
    </div>

    <div class="row">
      <div class="label">Mã kho:</div>
      <div class="value" style="font-family: monospace; font-weight: bold;">${record.ma_kho}</div>
    </div>

    <div class="row">
      <div class="label">Mã tài sản:</div>
      <div class="value">${record.ma_tai_san || '..........................................................'}</div>
    </div>

    <div class="row">
      <div class="label">Số Serial (S/N):</div>
      <div class="value" style="font-family: monospace; font-weight: bold; color: #1e40af;">${record.serial}</div>
    </div>

    <div class="row">
      <div class="label">Mục đích sử dụng:</div>
      <div class="value">${record.muc_dich}</div>
    </div>
  </div>

  <div class="signature-area">
    <div class="signature-date">Ngày ${sDay} tháng ${sMonth} năm ${sYear}</div>
    <div class="signature-box">
      <div class="signature-title">Người báo sử dụng</div>
      <div class="signature-sub">(Ký và ghi rõ họ tên)</div>
      <div class="signature-name">${record.nguoi_bao}</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generates a clean HTML representation of multiple batch reports
 */
export function generateBatchReportHtml(records: any[]): string {
  const renderedItems = records.map((record, index) => {
    const dateParts = record.ngay_bao ? record.ngay_bao.split('-') : ['2026', '05', '23'];
    const day = dateParts[2] || '23';
    const month = dateParts[1] || '05';
    const year = dateParts[0] || '2026';

    const signParts = record.ngay_ky ? record.ngay_ky.split('-') : [year, month, day];
    const sDay = signParts[2] || day;
    const sMonth = signParts[1] || month;
    const sYear = signParts[0] || year;

    return `
    <div class="report-block" style="${index < records.length - 1 ? 'page-break-after: always; margin-bottom: 50px;' : ''}">
      <table class="header-table" style="width: 100%; border-collapse: collapse; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 30px;">
        <tr>
          <td class="header-left" style="text-transform: uppercase; font-weight: bold; font-size: 11px; font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.5px;">
            Trung Tâm Bảo Đảm Kỹ Thuật<br>
            <span style="font-size: 13px;">Đội Thông Tin</span>
          </td>
          <td class="header-right" style="text-align: right; font-size: 11px; font-family: Arial, Helvetica, sans-serif; color: #64748b;">
            Phiếu số ${index + 1} / ${records.length}<br>
            Mã số phiếu: ${record.id}
          </td>
        </tr>
      </table>

      <div class="title-area" style="text-align: center; margin: 40px 0;">
        <h1 class="title-primary" style="font-size: 24px; font-weight: 800; letter-spacing: 1px; margin: 0;">PHIẾU BÁO SỬ DỤNG THIẾT BỊ</h1>
        <div class="title-sub" style="font-size: 11px; font-family: Arial, Helvetica, sans-serif; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px;">REPORTING EQUIPMENT UTILIZATION SHEET</div>
      </div>

      <div class="content-section" style="margin-top: 30px;">
        <div class="row" style="display: table; width: 100%; margin-bottom: 18px;">
          <div class="label" style="display: table-cell; font-weight: bold; font-family: Arial, Helvetica, sans-serif; width: 280px; font-size: 14px; color: #334155;">Người báo Sử dụng (bàn giao):</div>
          <div class="value value-bold" style="display: table-cell; border-bottom: 1px dotted #94a3b8; padding-left: 8px; font-size: 15px; font-weight: bold; color: #000;">${record.nguoi_bao}</div>
        </div>
        
        <div class="row" style="display: table; width: 100%; margin-bottom: 18px;">
          <div class="label" style="display: table-cell; font-weight: bold; font-family: Arial, Helvetica, sans-serif; width: 280px; font-size: 14px; color: #334155;">Người nhận bàn giao (nếu có):</div>
          <div class="value" style="display: table-cell; border-bottom: 1px dotted #94a3b8; padding-left: 8px; font-size: 15px;">${record.nguoi_nhan || 'N/A'}</div>
        </div>

        <div class="row" style="display: table; width: 100%; margin-bottom: 18px;">
          <div class="label" style="display: table-cell; font-weight: bold; font-family: Arial, Helvetica, sans-serif; width: 280px; font-size: 14px; color: #334155;">Tên thiết bị:</div>
          <div class="value value-bold" style="display: table-cell; border-bottom: 1px dotted #94a3b8; padding-left: 8px; font-size: 15px; font-weight: bold; color: #000;">${record.ten_thiet_bi}</div>
        </div>

        <div class="row" style="display: table; width: 100%; margin-bottom: 18px;">
          <div class="label" style="display: table-cell; font-weight: bold; font-family: Arial, Helvetica, sans-serif; width: 280px; font-size: 14px; color: #334155;">Mã kho:</div>
          <div class="value" style="display: table-cell; border-bottom: 1px dotted #94a3b8; padding-left: 8px; font-size: 15px; font-family: monospace; font-weight: bold;">${record.ma_kho}</div>
        </div>

        <div class="row" style="display: table; width: 100%; margin-bottom: 18px;">
          <div class="label" style="display: table-cell; font-weight: bold; font-family: Arial, Helvetica, sans-serif; width: 280px; font-size: 14px; color: #334155;">Mã tài sản:</div>
          <div class="value" style="display: table-cell; border-bottom: 1px dotted #94a3b8; padding-left: 8px; font-size: 15px;">${record.ma_tai_san || '..........................................................'}</div>
        </div>

        <div class="row" style="display: table; width: 100%; margin-bottom: 18px;">
          <div class="label" style="display: table-cell; font-weight: bold; font-family: Arial, Helvetica, sans-serif; width: 280px; font-size: 14px; color: #334155;">Số Serial (S/N):</div>
          <div class="value" style="display: table-cell; border-bottom: 1px dotted #94a3b8; padding-left: 8px; font-size: 15px; font-family: monospace; font-weight: bold; color: #1e40af;">${record.serial}</div>
        </div>

        <div class="row" style="display: table; width: 100%; margin-bottom: 18px;">
          <div class="label" style="display: table-cell; font-weight: bold; font-family: Arial, Helvetica, sans-serif; width: 280px; font-size: 14px; color: #334155;">Mục đích sử dụng:</div>
          <div class="value" style="display: table-cell; border-bottom: 1px dotted #94a3b8; padding-left: 8px; font-size: 15px;">${record.muc_dich}</div>
        </div>
      </div>

      <div class="signature-area" style="margin-top: 60px; text-align: right;">
        <div class="signature-date" style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #475569; margin-bottom: 8px;">Ngày ${sDay} tháng ${sMonth} năm ${sYear}</div>
        <div class="signature-box" style="display: inline-block; min-width: 220px; text-align: center;">
          <div class="signature-title" style="font-family: Arial, Helvetica, sans-serif; font-weight: bold; font-size: 13px;">Người báo sử dụng</div>
          <div class="signature-sub" style="font-size: 11px; color: #64748b; font-style: italic;">(Ký và ghi rõ họ tên)</div>
          <div class="signature-name" style="margin-top: 70px; font-weight: bold; font-size: 16px;">${record.nguoi_bao}</div>
        </div>
      </div>
    </div>
    `;
  }).join('<hr style="border: none; border-top: 2px dashed #94a3b8; margin: 50px 0;" class="no-print" />');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ngộp Phiếu Báo Sử Dụng Thiết Bị - ${records.length} Phiếu</title>
  <style>
    body {
      font-family: "Times New Roman", Times, Georgia, serif;
      padding: 40px;
      color: #0f172a;
      max-width: 750px;
      margin: 0 auto;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  ${renderedItems}
</body>
</html>`;
}
