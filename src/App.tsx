import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { DeviceReport } from './types';
import AuthScreen from './components/AuthScreen';
import ReportForm from './components/ReportForm';
import ReportList from './components/ReportList';
import ReportSlip from './components/ReportSlip';
import BatchReportSlip from './components/BatchReportSlip';
import { 
  Database, 
  PlusCircle, 
  Layers, 
  LogOut, 
  User as UserIcon, 
  Sparkles, 
  FileText,
  Warehouse
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<DeviceReport[]>([]);
  const [activeTab, setActiveTab] = useState<'form' | 'list'>('form');
  const [viewingRecord, setViewingRecord] = useState<DeviceReport | null>(null);
  const [viewingBatch, setViewingBatch] = useState<DeviceReport[] | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [showOfflineOption, setShowOfflineOption] = useState(false);

  // Authenticate user status
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowOfflineOption(true);
    }, 4000);

    const savedOfflineUser = localStorage.getItem('reports_offline_user');
    if (savedOfflineUser) {
      try {
        setUser(JSON.parse(savedOfflineUser));
        setAuthChecked(true);
        setLoading(false);
        clearTimeout(timer);
        return;
      } catch (e) {
        console.error(e);
      }
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      setAuthChecked(true);
      clearTimeout(timer);
      if (!usr) {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      clearTimeout(timer);
    };
  }, []);

  const handleBypassOffline = () => {
    const offlineUser = {
      uid: 'offline_guest_user',
      displayName: 'Cán bộ Khách (Offline)',
      email: 'offline_guest@thongtin.gov',
      isOffline: true,
      isAnonymous: true
    };
    setUser(offlineUser);
    localStorage.setItem('reports_offline_user', JSON.stringify(offlineUser));
    setAuthChecked(true);
    setLoading(false);
  };

  // Sync Reports database in real-time when authenticated
  useEffect(() => {
    if (!user) return;

    if (user.isOffline) {
      setLoading(true);
      const localData = localStorage.getItem('reports_offline_storage');
      if (localData) {
        try {
          setRecords(JSON.parse(localData));
        } catch (e) {
          console.error(e);
        }
      } else {
        // Safe sample default data for offline mode
        const sampleRecord: DeviceReport = {
          id: 'report_sample_123',
          ngay_bao: '2025-05-13',
          nguoi_bao: 'Ngô Vi Ngoán',
          nguoi_nhan: 'Trần Văn Hoàng (Đội Trưởng)',
          ten_thiet_bi: 'Nguồn PSU / AC (Nguồn PSU của VSS frequency)',
          ma_kho: 'KHO-KTH-01A',
          ma_tai_san: 'VSS-FREQ-01',
          serial: 'H4082729',
          muc_dich: 'Thay bệ hỏng S/N: H4082719 đang phục vụ VSS frequency trực canh kỹ thuật.',
          ngay_ky: '2025-05-13',
          createdAt: { seconds: Math.floor(Date.now() / 1000) },
          creatorUid: user.uid,
        };
        const initialList = [sampleRecord];
        localStorage.setItem('reports_offline_storage', JSON.stringify(initialList));
        setRecords(initialList);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    const collectionName = 'reports';

    const unsubscribeSnapshot = onSnapshot(
      collection(db, collectionName),
      (snapshot) => {
        const list: DeviceReport[] = [];
        snapshot.forEach((snapDoc) => {
          list.push({ id: snapDoc.id, ...snapDoc.data() } as DeviceReport);
        });

        // Sort descending by creation date/seconds in memory to prevent complex server index directives
        list.sort((a, b) => {
          const secA = a.createdAt?.seconds || 0;
          const secB = b.createdAt?.seconds || 0;
          return secB - secA;
        });

        setRecords(list);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, collectionName);
      }
    );

    return () => unsubscribeSnapshot();
  }, [user]);

  // Handle record deletion safely
  const handleDeleteRecord = async (id: string) => {
    const confirmation = window.confirm('Bạn có chắc chắn muốn xóa phiếu báo cáo này khỏi hệ thống?');
    if (!confirmation) return;

    if (user?.isOffline) {
      const updated = records.filter((r) => r.id !== id);
      setRecords(updated);
      localStorage.setItem('reports_offline_storage', JSON.stringify(updated));
      if (viewingRecord?.id === id) {
        setViewingRecord(null);
      }
      return;
    }

    const collectionName = 'reports';
    try {
      await deleteDoc(doc(db, collectionName, id));
      // If we are currently viewing the deleted record, exit view mode
      if (viewingRecord?.id === id) {
        setViewingRecord(null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${id}`);
    }
  };

  // Handle toggling of 'printed' status for single or multiple items
  const handleTogglePrinted = async (idOrIds: string | string[], currentStatus: boolean) => {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    if (ids.length === 0) return;

    if (user?.isOffline) {
      const updated = records.map((r) => 
        ids.includes(r.id) ? { ...r, printed: currentStatus } : r
      );
      setRecords(updated);
      localStorage.setItem('reports_offline_storage', JSON.stringify(updated));
      return;
    }

    const collectionName = 'reports';
    try {
      await Promise.all(
        ids.map((id) => updateDoc(doc(db, collectionName, id), { printed: currentStatus }))
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${collectionName}/${ids.join(',')}`);
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('reports_offline_user');
      await signOut(auth);
      setViewingRecord(null);
      setActiveTab('form');
    } catch (err) {
      console.error('Lỗi khi đăng xuất:', err);
    }
  };

  const handleAuthSuccess = (mockUser?: any) => {
    if (mockUser) {
      setUser(mockUser);
      localStorage.setItem('reports_offline_user', JSON.stringify(mockUser));
    }
    setLoading(false);
  };

  // Switch tabs and reset active viewing record
  const handleTabChange = (tab: 'form' | 'list') => {
    setViewingRecord(null);
    setViewingBatch(null);
    setActiveTab(tab);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          <div>
            <p className="text-sm font-semibold text-slate-700 animate-pulse">Đang khởi tạo bảo mật...</p>
            <p className="text-xs text-slate-400 mt-1">Hệ thống đang thiết lập liên kết an toàn tới Google Cloud.</p>
          </div>
          {showOfflineOption && (
            <div className="mt-2 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3 animate-fade-in">
              <p className="text-xs text-slate-500 leading-relaxed">
                Liên kết bảo mật đang mất nhiều thời gian hơn dự kiến do kết nối mạng. Bạn có thể chuyển sang chế độ ngoại tuyến ngay:
              </p>
              <button
                onClick={handleBypassOffline}
                id="bypass-offline-loading-btn"
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                Trải nghiệm Chế độ Offline
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-800 antialiased">
      {/* Top Banner Navigation bar - Only printed on screen matches */}
      <header className="no-print bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Logo element matches high-fidelity designs */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-500/10">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-base leading-none tracking-wide text-slate-50 uppercase">
                Số Hóa Thiết Bị
              </h1>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                Đội Thông Tin - TT Bảo Đảm Kỹ Thuật
              </p>
            </div>
          </div>

          {/* Navigation action anchors */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700/50">
              <button
                onClick={() => handleTabChange('form')}
                id="tab-btn-form"
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 ${
                  activeTab === 'form' && !viewingRecord
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-750'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                Phiếu Mới
              </button>

              <button
                onClick={() => handleTabChange('list')}
                id="tab-btn-list"
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 relative ${
                  activeTab === 'list' && !viewingRecord
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-750'
                }`}
              >
                <Warehouse className="w-4 h-4" />
                Kho Phiếu Cloud
                {records.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center border border-slate-900 animate-pulse">
                    {records.length}
                  </span>
                )}
              </button>
            </div>

                  {/* Logged user info */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-end text-right hidden md:block">
                <span className="text-xs font-bold leading-none">
                  {user.isOffline ? (
                    <span className="text-amber-400 font-extrabold uppercase tracking-wider text-[10px] flex items-center gap-1 bg-amber-950/40 border border-amber-900/40 px-1.5 py-0.5 rounded-md">
                      Offline Mode
                    </span>
                  ) : user.isAnonymous ? (
                    'Cán bộ Khách'
                  ) : (
                    user.displayName || 'Cán bộ'
                  )}
                </span>
                <span className="text-[9px] text-slate-400 font-mono mt-0.5 max-w-[120px] truncate">
                  {user.isOffline ? 'Lưu trữ cục bộ' : user.email || 'Anonymous Session'}
                </span>
              </div>
              <div className="p-1.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-300">
                <UserIcon className="w-4.5 h-4.5" />
              </div>

              {/* Log out anchor */}
              <button
                onClick={handleLogout}
                id="logout-btn"
                className="p-2 cursor-pointer bg-slate-800 hover:bg-rose-950 hover:text-rose-400 border border-slate-700 hover:border-rose-900/35 rounded-xl text-slate-400 transition-all"
                title="Đăng xuất khỏi Cloud"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {loading && records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24" id="loading-state">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-slate-600 text-sm font-semibold">Đang liên kết dữ liệu đám mây Google...</p>
            <p className="text-xs text-slate-400 mt-1">Hệ thống đồng bộ thiết lập trong một vài giây</p>
          </div>
        ) : (
          <div>
            {/* If a record is being viewed for print */}
            {viewingBatch ? (
              <BatchReportSlip
                records={viewingBatch}
                onBack={() => setViewingBatch(null)}
                googleToken={googleToken}
                setGoogleToken={setGoogleToken}
                onMarkPrinted={(ids) => handleTogglePrinted(ids, true)}
              />
            ) : viewingRecord ? (
              <ReportSlip
                record={viewingRecord}
                onBack={() => setViewingRecord(null)}
                googleToken={googleToken}
                setGoogleToken={setGoogleToken}
                onMarkPrinted={(id) => handleTogglePrinted(id, true)}
              />
            ) : (
              <div>
                {activeTab === 'form' ? (
                  <ReportForm onSuccess={() => handleTabChange('list')} isOffline={user?.isOffline} />
                ) : (
                  <ReportList
                    records={records}
                    onView={(rec) => {
                      setViewingBatch(null);
                      setViewingRecord(rec);
                    }}
                    onDelete={handleDeleteRecord}
                    onViewBatch={(batch) => {
                      setViewingRecord(null);
                      setViewingBatch(batch);
                    }}
                    onTogglePrinted={(id, current) => handleTogglePrinted(id, !current)}
                    onMarkMultiplePrinted={(ids, status) => handleTogglePrinted(ids, status)}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modern minimal footer bar */}
      <footer className="no-print bg-white border-t border-slate-200/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>© 2026 TRUNG TÂM BẢO ĐẢM KỸ THUẬT. Số hóa cơ sở hạ tầng thiết bị kỹ thuật Đội Thông Tin.</p>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>{user?.isOffline ? 'Local Storage Engine (Ready)' : 'Cloud Firestore Sync v2.5 (Ready)'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
