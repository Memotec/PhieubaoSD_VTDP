import { useState } from 'react';
import { DeviceReport } from '../types';
import { Search, Trash2, Eye, Printer, Inbox, Warehouse, User, FileSpreadsheet, CheckSquare, Square } from 'lucide-react';

interface ReportListProps {
  records: DeviceReport[];
  onView: (record: DeviceReport) => void;
  onDelete: (id: string) => void;
  onViewBatch: (records: DeviceReport[]) => void;
}

export default function ReportList({ records, onView, onDelete, onViewBatch }: ReportListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Handle smart filtering
  const filtered = records.filter(r => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      r.nguoi_bao?.toLowerCase().includes(q) ||
      r.nguoi_nhan?.toLowerCase().includes(q) ||
      r.ten_thiet_bi?.toLowerCase().includes(q) ||
      r.ma_kho?.toLowerCase().includes(q) ||
      r.ma_tai_san?.toLowerCase().includes(q) ||
      r.serial?.toLowerCase().includes(q) ||
      r.muc_dich?.toLowerCase().includes(q)
    );
  });

  // Export to standard UTF-8 CSV with byte-order-mark so Excel works in Vietnamese
  const handleExportCSV = () => {
    if (filtered.length === 0) {
      alert('Không có dữ liệu phù hợp để xuất báo cáo!');
      return;
    }

    let csv = '\uFEFF'; // UTF-8 BOM
    csv += 'Ngày báo cáo,Người báo sử dụng,Người nhận bàn giao,Tên thiết bị,Mã kho,Mã tài sản,Số Serial (S/N),Mục đích sử dụng,Ngày ký xác nhận\n';

    filtered.forEach(r => {
      const row = [
        r.ngay_bao,
        `"${r.nguoi_bao.replace(/"/g, '""')}"`,
        `"${(r.nguoi_nhan || '').replace(/"/g, '""')}"`,
        `"${r.ten_thiet_bi.replace(/"/g, '""')}"`,
        `"${r.ma_kho.replace(/"/g, '""')}"`,
        `"${(r.ma_tai_san || '').replace(/"/g, '""')}"`,
        `"${r.serial.replace(/"/g, '""')}"`,
        `"${r.muc_dich.replace(/"/g, '""')}"`,
        r.ngay_ky,
      ].join(',');
      csv += row + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bao_cao_phieu_thiet_bi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle single item selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle SELECT ALL visible items
  const isAllSelected = filtered.length > 0 && filtered.every(r => selectedIds.has(r.id));
  const toggleSelectAllVisible = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (isAllSelected) {
        // Deselect all currently filtered records
        filtered.forEach(r => next.delete(r.id));
      } else {
        // Select all filtered records
        filtered.forEach(r => next.add(r.id));
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Trigger print view for selected batch
  const handleBatchPrint = () => {
    const selectedRecords = records.filter(r => selectedIds.has(r.id));
    if (selectedRecords.length === 0) {
      alert('Vui lòng chọn ít nhất một phiếu thiết bị để in!');
      return;
    }
    onViewBatch(selectedRecords);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7" id="report-list-pane">
      {/* Search and Action head bar */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-extrabold text-slate-950 flex items-center gap-2">
            <Warehouse className="w-5.5 h-5.5 text-blue-600" />
            Cơ sở dữ liệu Thiết bị Quốc gia
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Đồng bộ hóa thời gian thực trực tuyến ({filtered.length} bản ghi phù hợp)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm mã kho, S/N, thiết bị, người..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-xs text-slate-800"
            />
          </div>

          {/* Export to Excel sheet */}
          <button
            onClick={handleExportCSV}
            id="export-csv-btn"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Xuất Báo Cáo (CSV)
          </button>
        </div>
      </div>

      {/* Selected Action Banner Overlay */}
      {selectedIds.size > 0 && (
        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in" id="batch-action-bar">
          <div className="flex items-center gap-2">
            <div className="p-1 px-1.5 bg-indigo-100 text-indigo-800 rounded-lg text-xs font-bold font-mono">
              BATCH
            </div>
            <p className="text-xs text-indigo-900 font-semibold">
              Đang lựa chọn <span className="font-bold underline text-indigo-700">{selectedIds.size}</span> phiếu ưu tiên.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearSelection}
              id="clear-select-btn"
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold transition-all"
            >
              Hủy chọn kẹp {selectedIds.size}
            </button>
            <button
              onClick={handleBatchPrint}
              id="batch-print-action-btn"
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-600/10"
            >
              <Printer className="w-3.5 h-3.5" />
              In Gộp PDF ({selectedIds.size}) phiếu
            </button>
          </div>
        </div>
      )}

      {/* Database list or empty state */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
            <Inbox className="w-7 h-7 text-slate-300" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">Chưa tìm thấy dữ liệu</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Không tìm thấy phiếu báo thiết bị nào phù hợp với từ khóa "{searchQuery}" hoặc chưa khởi tạo phiếu trên Cloud.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-5 sm:mx-0">
          <div className="inline-block min-w-full align-middle font-sans">
            <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50 text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                <tr>
                  {/* Checkbox column */}
                  <th className="py-3 px-4 w-12 text-center">
                    <button
                      onClick={toggleSelectAllVisible}
                      id="toggle-select-all-btn"
                      type="button"
                      className="text-slate-400 hover:text-slate-700 focus:outline-none transition-colors"
                      title={isAllSelected ? "Bỏ chọn tất cả" : "Chọn tất cả bản ghi hiển thị"}
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-4.5 h-4.5 text-indigo-600" />
                      ) : (
                        <Square className="w-4.5 h-4.5" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4">Ngày báo</th>
                  <th className="py-3 px-4">Thông tin cán bộ</th>
                  <th className="py-3 px-4">Chi tiết thiết bị / Mã số</th>
                  <th className="py-3 px-4">Mục đích bàn giao</th>
                  <th className="py-3 px-4 text-center">Tác vụ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filtered.map(record => {
                  const isChecked = selectedIds.has(record.id);
                  return (
                    <tr 
                      key={record.id} 
                      className={`transition-colors duration-150 ${
                        isChecked 
                          ? 'bg-indigo-50/40 hover:bg-indigo-50/60' 
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Checkbox item */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => toggleSelect(record.id)}
                          id={`checkbox-select-${record.id}`}
                          type="button"
                          className="text-slate-400 hover:text-indigo-600 focus:outline-none transition-colors"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4.5 h-4.5 text-indigo-600" />
                          ) : (
                            <Square className="w-4.5 h-4.5" />
                          )}
                        </button>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap font-medium text-slate-600 font-mono">
                        {record.ngay_bao}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {record.nguoi_bao}
                        </div>
                        {record.nguoi_nhan && (
                          <div className="text-[10px] text-slate-500 mt-1 pl-4.5 bg-slate-100/60 rounded px-1.5 py-0.5 w-max">
                            Nhận: {record.nguoi_nhan}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-950 block max-w-[220px] truncate" title={record.ten_thiet_bi}>
                          {record.ten_thiet_bi}
                        </div>
                        
                        {/* Flex wrapper for storage status labels */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {/* MÃ KHO BADGE - Yêu cầu thêm mục mã kho */}
                          <span className="text-[9px] font-mono leading-none bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-1 rounded-md font-bold uppercase">
                            Kho: {record.ma_kho}
                          </span>
                          
                          {record.ma_tai_san && (
                            <span className="text-[9px] font-mono leading-none bg-slate-100 text-slate-600 px-1.5 py-1 rounded-md font-medium">
                              TS: {record.ma_tai_san}
                            </span>
                          )}
                          
                          <span className="text-[9px] font-mono leading-none bg-cyan-50 border border-cyan-100 text-cyan-800 px-1.5 py-1 rounded-md font-medium">
                            S/N: {record.serial}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-500 max-w-[200px] truncate" title={record.muc_dich}>
                        {record.muc_dich}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => onView(record)}
                            id={`view-btn-${record.id}`}
                            className="p-2 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors outline-none"
                            title="Xem chi tiết & In phiếu"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDelete(record.id)}
                            id={`delete-btn-${record.id}`}
                            className="p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors outline-none"
                            title="Xóa phiếu khỏi danh sách"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
