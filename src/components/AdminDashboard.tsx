import React, { useState } from 'react';
import { useApp } from '../context';
import { STAGES_DATA } from '../data';
import { User, StudentJourney } from '../types';
import { 
  Users, CheckCircle, Clock, Trophy, BarChart3, 
  ExternalLink, Download, Search, Eye, Filter, ArrowUpRight 
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { users, journeys } = useApp();
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [filterClass, setFilterClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const students = users.filter((u) => u.role === 'student');

  // Filtered students
  const filteredStudents = students.filter((s) => {
    const matchesClass = filterClass === 'all' || s.class === filterClass;
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesSearch;
  });

  // Analytics
  const totalStudents = students.length;
  let completedAllCount = 0;
  let totalConfidenceSum = 0;
  let totalStagesCompletedSum = 0;

  students.forEach((s) => {
    const j = journeys[s.id];
    const completedStages = j ? Object.keys(j.stages).length : 0;
    if (completedStages === 8) completedAllCount++;
    if (j?.confidenceScore) totalConfidenceSum += j.confidenceScore;
    totalStagesCompletedSum += completedStages;
  });

  const completionPercentage = totalStudents ? Math.round((completedAllCount / totalStudents) * 100) : 0;
  const avgConfidence = totalStudents ? Math.round(totalConfidenceSum / totalStudents) : 0;

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-emerald-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <div className="max-w-2xl">
          <span className="px-3 py-1 rounded-full bg-teal-500/30 text-teal-200 text-xs font-bold uppercase tracking-wider">
            Portal Monitoring Guru
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-2 font-display">
            Dashboard Analitik & Refleksi Siswa
          </h1>
          <p className="text-xs sm:text-sm text-teal-100/80 mt-1 leading-relaxed">
            Pantau perkembangan Growth Mindset setiap peserta didik, analisis hambatan utama dalam belajar, dan verifikasi komitmen perubahan.
          </p>
        </div>
      </div>

      {/* Analytics KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase">Total Siswa Terdaftar</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-black text-slate-800">{totalStudents} Siswa</p>
          <p className="text-[11px] text-slate-400 mt-1">Kelas 8A & Kelas 8B</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase">Tingkat Penyelesaian</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{completionPercentage}%</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {completedAllCount} dari {totalStudents} menyelesaikan 8 tahap
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase">Rata-rata Skor Keyakinan</span>
            <BarChart3 className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-indigo-600">{avgConfidence} / 100</p>
          <p className="text-[11px] text-slate-400 mt-1">Indeks efikasi diri siswa</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase">Google Drive Sync</span>
            <ExternalLink className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-black text-sky-600">Aktif</p>
          <p className="text-[11px] text-slate-400 mt-1">Folder auto-organizer per kelas</p>
        </div>
      </div>

      {/* Main Table & Filter */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Controls */}
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
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
              <option value="Kelas 8A">Kelas 8A</option>
              <option value="Kelas 8B">Kelas 8B</option>
            </select>
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
                <th className="px-5 py-3.5">Nama Siswa</th>
                <th className="px-5 py-3.5">Kelas</th>
                <th className="px-5 py-3.5">Progress Tahap</th>
                <th className="px-5 py-3.5">Keyakinan</th>
                <th className="px-5 py-3.5">Status Drive</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((student) => {
                const j = journeys[student.id];
                const completedCount = j ? Object.keys(j.stages).length : 0;
                const isAllDone = completedCount === 8;

                return (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={student.avatarUrl}
                          className="w-8 h-8 rounded-full object-cover"
                          alt=""
                        />
                        <div>
                          <p className="font-bold text-slate-800">{student.name}</p>
                          <p className="text-[10px] text-slate-400">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {student.class}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="w-36">
                        <div className="flex justify-between text-[10px] font-bold mb-1">
                          <span className="text-slate-600">{completedCount} / 8 Tahap</span>
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
                      <span className="font-extrabold text-slate-700">
                        {j?.confidenceScore || 0} / 100
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {j?.driveExportedUrl ? (
                        <span className="text-emerald-700 bg-emerald-50 font-bold px-2 py-1 rounded-lg inline-flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> Tersimpan
                        </span>
                      ) : (
                        <span className="text-slate-400">Belum diupload</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspeksi Refleksi</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Inspector Detail of Selected Student */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={selectedStudent.avatarUrl}
                  className="w-11 h-11 rounded-2xl object-cover border border-slate-700"
                  alt=""
                />
                <div>
                  <h3 className="text-base font-bold">{selectedStudent.name}</h3>
                  <p className="text-xs text-slate-400">{selectedStudent.class} • {selectedStudent.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-800"
              >
                Tutup
              </button>
            </div>

            {/* Content Inspector Scrollable */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <h4 className="text-xs font-extrabold uppercase text-slate-400">
                Detail Isian 8 Tahap Refleksi:
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
                        ? 'bg-white border-slate-200'
                        : 'bg-slate-50 border-dashed border-slate-200 text-slate-400'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h5 className="font-bold text-xs text-slate-800">
                        Tahap {stage.id}: {stage.title}
                      </h5>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {stageData?.completed ? 'Lengkap' : 'Belum'}
                      </span>
                    </div>

                    {stageData?.completed ? (
                      <div className="space-y-2 mt-2">
                        {stage.fields.map((f) => {
                          const val = answers[f.id];
                          if (val === undefined) return null;
                          return (
                            <div key={f.id} className="bg-slate-50 p-2.5 rounded-xl text-xs">
                              <p className="text-[10px] text-slate-500 font-bold">{f.label}</p>
                              <p className="text-slate-800 font-medium mt-0.5">
                                {Array.isArray(val) ? val.join(', ') : String(val)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs italic text-slate-400">Siswa belum mengisi tahap ini.</p>
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
