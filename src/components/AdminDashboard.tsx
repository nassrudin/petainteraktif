import { DatabaseMaintenancePanel } from './DatabaseMaintenancePanel';
import { DriveBackupPanel } from './DriveBackupPanel';
import React, { useEffect, useState } from 'react';
import { useApp } from '../context';
import { STAGES_DATA, PEGANGAN_DI_SEPANJANG_JALAN, PESAN_UNTUK_DIRI_SAYA, DEFAULT_CLASS_CONFIGS } from '../data';
import { ActiveStudent } from '../types';
import { ResultView } from './ResultView';
import { firebaseEnabled } from '../firebase-config';
import { StaffAccountsPanel } from './StaffAccountsPanel';
import { backupFileName } from '../utils/databaseBackup';
import { buildStudentCsv, studentCsvFileName } from '../utils/studentCsv';
import { completedStageCount, nextStudentSort, sortStudents, StudentSort, StudentSortKey } from '../utils/studentSort';
import { formatDashboardDate } from '../utils/displayDate';
import { 
  Users, CheckCircle, BarChart3, 
  ExternalLink, Download, Search, Eye, Filter,
  KeyRound, CheckCircle2, AlertCircle, RefreshCw,
  CloudUpload, Link as LinkIcon, Plus, Trash2, Save, X, MonitorPlay, Clock3, ArrowUp, ArrowDown, ArrowUpDown
} from 'lucide-react';

interface AdminDashboardProps {
  isDarkMode?: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = () => {
  const { 
    allStudents, 
    journeys, 
    adminCredentials, 
    adminRole,
    updateAdminCredentials,
    adminLogout,
    appSettings,
    updateAppSettings,
    deleteStudent,
    exportDatabaseBackup,
  } = useApp();

  const [selectedStudent, setSelectedStudent] = useState<ActiveStudent | null>(null);
  const [filterClass, setFilterClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [studentSort, setStudentSort] = useState<StudentSort | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isMaintaining, setIsMaintaining] = useState(false);
  const [backupFeedback, setBackupFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeAdminTab, setActiveAdminTab] = useState<'students' | 'drive' | 'security' | 'classsettings' | 'access'>('students');
  const [viewingStudentReport, setViewingStudentReport] = useState<ActiveStudent | null>(null);

  // Change password form state
  const [newUsername, setNewUsername] = useState(adminCredentials.username);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authFeedback, setAuthFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Class settings state
  const [editClasses, setEditClasses] = useState(appSettings.classNames);
  useEffect(() => { setEditClasses(appSettings.classNames); }, [appSettings.classNames]);
  const [classSettingsFeedback, setClassSettingsFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [accessFeedback, setAccessFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Available classes
  const classList = Array.from(new Set(allStudents.map((s) => s.class))).sort();

  // Filtered students
  const filteredStudents = sortStudents(allStudents.filter((s) => {
    const matchesClass = filterClass === 'all' || s.class === filterClass;
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesSearch;
  }), journeys, studentSort);

  const sortHeader = (key: StudentSortKey, label: string) => {
    const active = studentSort?.key === key;
    const direction = active ? studentSort.direction : null;
    const SortIcon = direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ArrowUpDown;
    return <th key={key} scope="col" className="px-5 py-3.5" aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'}>
      <button type="button" onClick={() => setStudentSort(current => nextStudentSort(current, key))}
        title={`Urutkan ${label}: ${direction === 'asc' ? 'menurun' : 'menaik'}`}
        className={`flex items-center gap-1.5 uppercase tracking-wider font-bold text-left cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-4 hover:text-emerald-700 ${active ? 'text-emerald-700' : ''}`}>
        {label}<SortIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      </button>
    </th>;
  };

  // Analytics
  const totalStudents = allStudents.length;
  let completedAllCount = 0;
  let totalConfidenceSum = 0;
  let scoredStudentsCount = 0;
  let totalStagesCompletedSum = 0;

  allStudents.forEach((s) => {
    const j = journeys[s.id];
    const completedStages = completedStageCount(j);
    if (completedStages === 8) completedAllCount++;
    if (j?.confidenceScore) { totalConfidenceSum += j.confidenceScore; scoredStudentsCount++; }
    totalStagesCompletedSum += completedStages;
  });

  const completionPercentage = totalStudents ? Math.round((completedAllCount / totalStudents) * 100) : 0;
  const avgConfidence = scoredStudentsCount ? Math.round(totalConfidenceSum / scoredStudentsCount) : 0;

  if (viewingStudentReport) {
    return (
      <ResultView
        targetStudent={viewingStudentReport}
        onBackToMap={() => setViewingStudentReport(null)}
        isTeacherView={true}
      />
    );
  }

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setAuthFeedback({ type: 'error', text: 'Konfirmasi password baru tidak cocok.' });
      return;
    }

    const res = updateAdminCredentials(oldPassword, newUsername, newPassword);
    if (res.success) {
      setAuthFeedback({ type: 'success', text: res.message });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setAuthFeedback({ type: 'error', text: res.message });
    }
  };

  const handleSaveClassSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await updateAppSettings({ ...appSettings, classNames: editClasses });
    if (res.success) {
      setClassSettingsFeedback({ type: 'success', text: res.message });
    } else {
      setClassSettingsFeedback({ type: 'error', text: res.message });
    }
  };

  const handleToggleEarlyAccess = async () => {
    const allowEarlyPhaseTwo = !appSettings.allowEarlyPhaseTwo;
    const res = await updateAppSettings({ ...appSettings, allowEarlyPhaseTwo });
    setAccessFeedback({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
  };

  const handleResetDefaultClasses = () => {
    setEditClasses(DEFAULT_CLASS_CONFIGS);
    setClassSettingsFeedback(null);
  };

  const handleAddClass = () => {
    let nextNum = 1;
    while (editClasses.some(c => c.className === `X-${nextNum}`)) nextNum++;
    setEditClasses([...editClasses, { className: `X-${nextNum}`, absentRangeMin: 1, absentRangeMax: 36 }]);
  };

  const handleRemoveClass = (index: number) => {
    if (editClasses.length > 1) {
      setEditClasses(editClasses.filter((_, i) => i !== index));
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (isMaintaining) return;
    if (!confirm(firebaseEnabled
      ? 'Hapus siswa ini beserta seluruh jawabannya dari Firebase?'
      : 'Hapus siswa ini beserta seluruh jawabannya dari browser ini?')) return;
    try { await deleteStudent(studentId); }
    catch (error) { alert(error instanceof Error ? error.message : 'Gagal menghapus data siswa.'); }
  };

  const handleDownloadStudentResult = (studentId: string, name: string, studentClass: string) => {
    // Trigger window.print which will print the result view in PPT format
    alert(`Download fitur untuk ${name} akan segera tersedia.`);
  };

  const handleBackup = async () => {
    if (isBackingUp || isExportingCsv || isMaintaining) return;
    setIsBackingUp(true);
    setBackupFeedback(null);
    try {
      const backup = await exportDatabaseBackup();
      const fileName = backupFileName(backup.exportedAt);
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2) + '\n'], { type: 'application/json;charset=utf-8' }));
      const link = document.createElement('a');
      try {
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
      } finally {
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setBackupFeedback({ type: 'success', text: `Unduhan ${fileName} dimulai. Backup berisi ${backup.studentCount} siswa beserta seluruh jawaban dan pengaturan kelas. Simpan berkas ini sebagai cadangan.` });
    } catch (error) {
      setBackupFeedback({ type: 'error', text: `Backup gagal; tidak ada berkas backup yang dibuat. ${error instanceof Error ? error.message : 'Periksa koneksi dan coba kembali.'}` });
    } finally {
      setIsBackingUp(false);
    }
  };


  const handleExportCSV = async () => {
    if (isExportingCsv || isBackingUp || isMaintaining) return;
    setIsExportingCsv(true);
    setBackupFeedback(null);
    try {
      const backup = await exportDatabaseBackup();
      const csvContent = buildStudentCsv(backup);
      const blobUrl = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      try {
        link.href = blobUrl;
        link.download = studentCsvFileName(backup.exportedAt);
        document.body.appendChild(link);
        link.click();
      } finally {
        link.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      }
      setBackupFeedback({ type: 'success', text: `Unduhan CSV lengkap dimulai: ${backup.studentCount} siswa dari semua kelas, identitas, progres, tanggal, dan seluruh jawaban Pos 1–8. Filter dashboard tidak membatasi unduhan.` });
    } catch (error) {
      setBackupFeedback({ type: 'error', text: `CSV gagal dibuat. ${error instanceof Error ? error.message : 'Periksa koneksi Firebase dan coba kembali.'}` });
    } finally { setIsExportingCsv(false); }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-emerald-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="max-w-2xl">
            <span className="px-3 py-1 rounded-full bg-teal-500/30 text-teal-200 text-xs font-bold uppercase tracking-wider">
              {adminRole === 'admin' ? 'Portal Admin' : 'Portal Monitoring Guru BK'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-2 font-display">
              Dashboard Analitik & Refleksi Siswa
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/80 mt-1 leading-relaxed">
              Delapan pos untuk mengubah rasa ragu menjadi keberanian bertumbuh, media layanan bimbingan klasikal kelas X.
            </p>
          </div>

          {/* Admin tabs switcher */}
          <div className="flex flex-wrap items-center gap-2 bg-black/20 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 self-start md:self-center">
            <button
              onClick={() => setActiveAdminTab('students')}
              disabled={isMaintaining}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeAdminTab === 'students'
                  ? 'bg-white text-teal-900 shadow-sm'
                  : 'text-teal-100 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Rekap Siswa</span>
            </button>
            <button
              onClick={() => setActiveAdminTab('classsettings')}
              disabled={isMaintaining}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeAdminTab === 'classsettings'
                  ? 'bg-white text-teal-900 shadow-sm'
                  : 'text-teal-100 hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Seting Kelas/Absen</span>
            </button>
            <button
              onClick={() => setActiveAdminTab('access')}
              disabled={isMaintaining}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeAdminTab === 'access'
                  ? 'bg-white text-teal-900 shadow-sm'
                  : 'text-teal-100 hover:text-white'
              }`}
            >
              <Clock3 className="w-3.5 h-3.5" />
              <span>Akses Pos</span>
            </button>
            <button
              onClick={() => setActiveAdminTab('drive')}
              disabled={isMaintaining}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeAdminTab === 'drive'
                  ? 'bg-white text-teal-900 shadow-sm'
                  : 'text-teal-100 hover:text-white'
              }`}
            >
              <CloudUpload className="w-3.5 h-3.5" />
              <span>Pengaturan Drive</span>
            </button>
            <button
              onClick={() => setActiveAdminTab('security')}
              disabled={isMaintaining}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeAdminTab === 'security'
                  ? 'bg-white text-teal-900 shadow-sm'
                  : 'text-teal-100 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{firebaseEnabled ? 'Akun Admin & Guru' : 'Ganti Password'}</span>
            </button>
          </div>
        </div>
      </div>

      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-950">
        {firebaseEnabled
          ? 'Rekap ini dibaca dari Firebase. Jawaban siswa dari perangkat lain akan muncul setelah tersimpan dan tersinkron.'
          : 'Rekap ini hanya berisi data yang tersimpan di browser ini. Jawaban dari perangkat siswa lain tidak muncul otomatis.'}
      </p>

      {backupFeedback && <p role={backupFeedback.type === 'error' ? 'alert' : 'status'} className={`rounded-2xl border px-5 py-3 text-xs break-words ${backupFeedback.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
        {backupFeedback.text}
      </p>}


      {/* STUDENTS TAB */}
      {activeAdminTab === 'students' && (
        <>
          <DatabaseMaintenancePanel backupBusy={isBackingUp} exportBusy={isExportingCsv} onBackup={handleBackup} onBusyChange={setIsMaintaining} />
          {/* Analytics KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase">Total Siswa Terdata</span>
                <Users className="w-4 h-4 text-teal-600" />
              </div>
              <p className="text-2xl font-black text-slate-800">{totalStudents} Siswa</p>
              <p className="text-[11px] text-slate-400 mt-1">Kelas X terdaftar di sesi</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase">Tuntas 8 Pos</span>
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-600">{completionPercentage}%</p>
              <p className="text-[11px] text-slate-400 mt-1">
                 {completedAllCount} dari {totalStudents} menyelesaikan semua pos
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                 <span className="text-xs font-bold uppercase">Rata-rata Skala Keyakinan</span>
                <BarChart3 className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-black text-indigo-600">{avgConfidence} / 100</p>
               <p className="text-[11px] text-slate-400 mt-1">Skala jawaban terakhir, dikonversi ke 0–100</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase">{firebaseEnabled ? 'Penyimpanan Firebase' : 'Auto-Sync Google Drive'}</span>
                <CloudUpload className="w-4 h-4 text-sky-600" />
              </div>
              <p className="text-sm font-black text-emerald-700 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                 <span>{firebaseEnabled ? 'Aktif' : 'Belum diatur'}</span>
              </p>
              <p className="text-[10px] text-slate-400 truncate mt-1">{firebaseEnabled ? 'Jawaban dibaca dari Firestore' : 'Pengiriman perlu dicek di Drive'}</p>
            </div>
          </div>

          {/* Main Table & Filter */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Table Controls */}
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama siswa..."
                    className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-emerald-500"
                  />
                </div>

                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white focus:outline-emerald-500 cursor-pointer"
                >
                  <option value="all">Semua Kelas</option>
                  {classList.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <button
                  onClick={handleExportCSV}
                  disabled={isExportingCsv || isBackingUp || isMaintaining}
                  aria-busy={isExportingCsv}
                  className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                  title="Unduh semua siswa dari Firebase beserta identitas, progres, dan seluruh jawaban Pos 1–8"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>{isExportingCsv ? 'Membuat CSV...' : 'Unduh CSV'}</span>
                </button>
              </div>

              <div className="text-xs text-slate-500 font-semibold self-end sm:self-center">
                Menampilkan {filteredStudents.length} siswa
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    {sortHeader('name', 'Nama Siswa')}
                    {sortHeader('class', 'Kelas')}
                    {sortHeader('absentNumber', 'Absen')}
                    {sortHeader('progress', 'Kemajuan Pos')}
                    {sortHeader('confidenceScore', 'Skala Keyakinan')}
                    <th className="px-5 py-3.5">{firebaseEnabled ? 'Penyimpanan' : 'Status Google Drive'}</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                        Tidak ada siswa yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => {
                      const j = journeys[student.id];
                      const completedCount = completedStageCount(j);

                      return (
                        <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-4 min-w-[15rem]">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                                student.gender === 'L' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-pink-100 text-pink-800'
                              }`}>
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">{student.name}</p>
                                <p className="text-[10px] text-slate-500 whitespace-nowrap">Mulai: {formatDashboardDate(student.startedAt)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                              {student.class}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-xs font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded">
                              #{student.absentNumber}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="w-36">
                              <div className="flex justify-between text-[10px] font-bold mb-1">
                                <span className="text-slate-600">{completedCount} / 8 Pos</span>
                                <span className="text-emerald-600">{Math.round((completedCount / 8) * 100)}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${(completedCount / 8) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-extrabold text-slate-800">
                              {j?.confidenceScore || 0} / 100
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="text-slate-600">
                              Firebase
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setViewingStudentReport(student)}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-emerald-500 bg-white text-emerald-700 font-bold text-xs hover:bg-emerald-50 transition-all flex items-center gap-1.5 cursor-pointer"
                                title="Lihat & Download Hasil Siswa"
                              >
                                <MonitorPlay className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Download Hasil</span>
                                <span className="sm:hidden"><Download className="w-3.5 h-3.5" /></span>
                              </button>
                              <button
                                onClick={() => setSelectedStudent(student)}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-emerald-500 bg-white text-emerald-700 font-bold text-xs hover:bg-emerald-50 transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Lihat Refleksi</span>
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(student.id)}
                                disabled={isMaintaining}
                                className="px-3 py-1.5 rounded-xl border border-red-200 bg-white text-red-600 font-bold text-xs hover:bg-red-50 transition-all flex items-center gap-1.5 cursor-pointer"
                                title="Hapus jawaban siswa ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* STAGE ACCESS SETTINGS TAB */}
      {activeAdminTab === 'access' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 max-w-3xl mx-auto space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
              <Clock3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Akses Pos 5–8</h2>
              <p className="text-xs text-slate-500">Aturan standar: Pos 5 dibuka tujuh hari setelah Pos 4 selesai.</p>
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={appSettings.allowEarlyPhaseTwo}
              onChange={handleToggleEarlyAccess}
              className="mt-0.5 h-5 w-5 accent-emerald-600"
            />
            <span className="space-y-1">
              <span className="block text-sm font-bold text-slate-800">Izinkan melanjutkan tanpa menunggu satu minggu</span>
              <span className="block text-xs text-slate-600 leading-relaxed">
                Jika aktif, Pos 5 bisa dibuka segera setelah Pos 4 selesai. Pos 6–8 tetap harus dikerjakan berurutan.
              </span>
            </span>
          </label>

          <p className={`rounded-xl px-4 py-3 text-xs font-semibold ${appSettings.allowEarlyPhaseTwo
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : 'bg-amber-50 text-amber-900 border border-amber-200'}`}>
            {appSettings.allowEarlyPhaseTwo
              ? `Akses lebih awal aktif${firebaseEnabled ? ' untuk semua perangkat.' : ' pada browser ini.'}`
              : 'Aturan standar menunggu satu minggu aktif.'}
          </p>

          {accessFeedback && (
            <p role="status" className={`text-xs font-semibold ${accessFeedback.type === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>
              {accessFeedback.text}
            </p>
          )}

          <p className="text-xs text-slate-600 leading-relaxed">
            {firebaseEnabled
              ? 'Pengaturan disimpan di Firebase dan berlaku untuk semua perangkat siswa.'
              : 'Pengaturan ini tersimpan di browser ini saja. GitHub Pages tidak dapat mengirim perubahan admin secara otomatis ke perangkat siswa lain.'}
          </p>
        </div>
      )}

      {/* CLASS SETTINGS TAB */}
      {activeAdminTab === 'classsettings' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Pengaturan Kelas & Nomor Absen</h2>
              <p className="text-xs text-slate-500">Tambah atau hapus kelas, atur rentang nomor absen per kelas</p>
            </div>
          </div>

          {classSettingsFeedback && (
            <div
              className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
                classSettingsFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{classSettingsFeedback.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveClassSettings} className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-700">Daftar Kelas Tersedia:</p>
                <button
                  type="button"
                  onClick={handleAddClass}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Kelas</span>
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {editClasses.map((cls, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200">
                    <input
                      type="text"
                      value={cls.className}
                      onChange={(e) => {
                        const updated = [...editClasses];
                        updated[idx] = { ...cls, className: e.target.value };
                        setEditClasses(updated);
                      }}
                      className="flex-1 text-xs px-2 py-1.5 rounded border border-slate-200 focus:border-emerald-500 outline-none"
                      placeholder="Nama kelas"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        value={cls.absentRangeMin}
                        onChange={(e) => {
                          const updated = [...editClasses];
                          updated[idx] = { ...cls, absentRangeMin: parseInt(e.target.value) || 1 };
                          setEditClasses(updated);
                        }}
                        className="w-16 text-xs px-2 py-1.5 rounded border border-slate-200 focus:border-emerald-500 outline-none text-center"
                      />
                      <span className="text-xs text-slate-500">-</span>
                      <input
                        type="number"
                        min={cls.absentRangeMin}
                        value={cls.absentRangeMax}
                        onChange={(e) => {
                          const updated = [...editClasses];
                          updated[idx] = { ...cls, absentRangeMax: parseInt(e.target.value) || 36 };
                          setEditClasses(updated);
                        }}
                        className="w-16 text-xs px-2 py-1.5 rounded border border-slate-200 focus:border-emerald-500 outline-none text-center"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveClass(idx)}
                      disabled={editClasses.length <= 1}
                      className="px-2 py-1.5 rounded-lg bg-red-100 text-red-600 text-xs font-bold hover:bg-red-200 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetDefaultClasses}
                className="text-xs text-slate-500 hover:text-teal-700 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset ke Default (X-1 s.d X-12)</span>
              </button>

              <button
                type="submit"
                className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan Kelas</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {activeAdminTab === 'drive' && <DriveBackupPanel />}

      {/* CHANGE PASSWORD / SECURITY TAB */}
      {activeAdminTab === 'security' && (firebaseEnabled ? <StaffAccountsPanel /> : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 max-w-xl mx-auto">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Pengaturan Akun Guru / Admin</h2>
              <p className="text-xs text-slate-500">Ubah username dan password untuk akses mandiri dashboard BK</p>
            </div>
          </div>

          {authFeedback && (
            <div
              className={`p-3.5 mb-5 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
                authFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {authFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{authFeedback.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-bold text-slate-700">Username Guru / Admin</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
                required
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-bold text-slate-700">Password Lama</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Ketik password saat ini..."
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
                required
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-bold text-slate-700">Password Baru</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 4 karakter..."
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
                required
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-bold text-slate-700">Konfirmasi Password Baru</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ketik ulang password baru..."
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Simpan Perubahan Username & Password
              </button>
            </div>
          </form>
        </div>
      ))}

      {/* Selected Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-800 via-emerald-800 to-slate-900 text-white p-6 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md text-white font-black text-base flex items-center justify-center border border-white/20">
                  {selectedStudent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{selectedStudent.name}</h3>
                  <p className="text-xs text-teal-200">
                    Kelas: {selectedStudent.class} • Mulai: {formatDashboardDate(selectedStudent.startedAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content List of 8 Stages */}
            <div className="p-6 overflow-y-auto space-y-4">
              <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">
                Rangkuman Jawaban Refleksi 8 Pos:
              </h4>

              {STAGES_DATA.map((stage) => {
                const j = journeys[selectedStudent.id];
                const stageData = j?.stages[stage.id];
                const answers = stageData?.answers || {};

                return (
                  <div
                    key={stage.id}
                    className={`p-4 rounded-2xl border ${
                      stageData?.completed
                        ? 'bg-white border-slate-200 shadow-xs'
                        : 'bg-slate-50 border-dashed border-slate-200 text-slate-400'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">
                          {stage.id}
                        </span>
                        <h5 className="font-bold text-xs text-slate-800">
                          {stage.title} ({stage.islandName})
                        </h5>
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                          Etape {stage.etapeNumber} • {stage.sectionTag}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        stageData?.completed
                          ? 'text-emerald-700 bg-emerald-50'
                          : 'text-slate-400 bg-slate-100'
                      }`}>
                        {stageData?.completed ? 'Selesai' : 'Belum'}
                      </span>
                    </div>

                    {stageData?.completed ? (
                      <div className="space-y-2 mt-3">
                        {stage.fields.map((f) => {
                          const val = answers[f.id];
                          if (val === undefined) return null;
                          return (
                            <div key={f.id} className="bg-slate-50 p-2.5 rounded-xl text-xs">
                              <p className="text-[10px] text-slate-500 font-bold">{f.label}</p>
                              <p className="text-slate-800 font-medium mt-0.5 whitespace-pre-wrap">
                                {Array.isArray(val) ? val.join(', ') : String(val)}
                              </p>
                            </div>
                          );
                        })}
                        <p className="text-[10px] text-slate-400 text-right pt-1">
                          Waktu pengisian: {stageData.completedAt}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs italic text-slate-400">Siswa belum mengisi pos ini.</p>
                     )}
                   </div>
                 );
               })}
             </div>
           </div>
         </div>
       )}
    </div>
  );
};

