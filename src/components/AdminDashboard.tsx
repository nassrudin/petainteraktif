import React, { useState } from 'react';
import { useApp } from '../context';
import { STAGES_DATA } from '../data';
import { ActiveStudent } from '../types';
import { Users, CheckCircle, Search, Eye, Trash2, Download } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { allStudents, journeys, resetStudentProgress } = useApp();

  const [selectedStudent, setSelectedStudent] = useState<ActiveStudent | null>(null);
  const [filterClass, setFilterClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const classList = Array.from(new Set(allStudents.map((s) => s.class))).sort();

  const filteredStudents = allStudents.filter((s) => {
    const matchesClass = filterClass === 'all' || s.class === filterClass;
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesSearch;
  });

  const handleDeleteStudent = (studentId: string) => {
    if (!confirm('Hapus semua jawaban dan reset progress siswa ini?')) return;
    resetStudentProgress(studentId);
  };

  const handleExportCSV = () => {
    const headers = ['Nama Siswa', 'Kelas', 'Skor Keyakinan', 'Jumlah Tahap Selesai', 'Terakhir Update'];
    const rows = allStudents.map((s) => {
      const j = journeys[s.id];
      const count = j ? Object.keys(j.stages).length : 0;
      return [
        `"${s.name}"`,
        `"${s.class}"`,
        j?.confidenceScore || 0,
        `${count}/8`,
        `"${j?.updatedAt || s.startedAt}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_growth_mindset_kelas_X_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-700 to-emerald-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <h1 className="text-2xl font-black tracking-tight">Dashboard Monitoring Siswa</h1>
        <p className="text-xs text-emerald-100 mt-1">Lihat dan kelola data refleksi siswa kelas X</p>
      </div>

      {/* Analytics KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase">Total Siswa</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-black text-slate-800">{allStudents.length} Siswa</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase">Tuntas 8 Pos</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600">
            {allStudents.filter(s => journeys[s.id]?.stages[8]?.completed).length} / {allStudents.length}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 border-b">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
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
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white cursor-pointer"
          >
            <option value="all">Semua Kelas</option>
            {classList.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh CSV</span>
          </button>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-b-3xl border border-x border-b border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
            <tr>
              <th className="px-5 py-3.5">Nama Siswa</th>
              <th className="px-5 py-3.5">Kelas</th>
              <th className="px-5 py-3.5">Absen</th>
              <th className="px-5 py-3.5">Kemajuan</th>
              <th className="px-5 py-3.5">Skor</th>
              <th className="px-5 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-400">Tidak ada data</td>
              </tr>
            ) : (
              filteredStudents.map((student) => {
                const j = journeys[student.id];
                const completedCount = j ? Object.keys(j.stages).length : 0;
                
                return (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center ${
                          student.gender === 'L' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                        }`}>
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <p className="font-bold text-slate-800">{student.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-semibold bg-slate-100 px-2.5 py-1 rounded-md">{student.class}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-bold bg-slate-50 px-2 py-0.5 rounded">#{student.absentNumber}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="w-36">
                        <div className="flex justify-between text-[10px] font-bold mb-1">
                          <span className="text-slate-600">{completedCount}/8</span>
                          <span className="text-emerald-600">{Math.round((completedCount / 8) * 100)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(completedCount / 8) * 100}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-extrabold">{j?.confidenceScore || 0}/100</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setSelectedStudent(student)} className="px-3 py-1.5 rounded-xl border border-slate-200 text-emerald-700 hover:bg-emerald-50 flex items-center gap-1.5 cursor-pointer">
                          <Eye className="w-3.5 h-3.5" /> Lihat
                        </button>
                        <button onClick={() => handleDeleteStudent(student.id)} className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1.5 cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
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

      {/* Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-teal-700 to-emerald-800 text-white p-6 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center font-black text-base border border-white/20">
                  {selectedStudent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{selectedStudent.name}</h3>
                  <p className="text-xs text-teal-100">
                    Kelas: {selectedStudent.class} • Absen #{selectedStudent.absentNumber}
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
            <div className="p-6 overflow-y-auto space-y-4">
              <h4 className="font-bold text-xs text-slate-400 uppercase mb-2">Refleksi 8 Pos:</h4>
              {STAGES_DATA.map((stage) => {
                const stageData = journeys[selectedStudent.id]?.stages[stage.id];
                const answers = stageData?.answers || {};
                
                return (
                  <div key={stage.id} className={`p-4 rounded-2xl border ${
                    stageData?.completed ? 'bg-white border-slate-200' : 'bg-slate-50 border-dashed border-slate-200 text-slate-400'
                  }`}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">
                          {stage.id}
                        </span>
                        <h5 className="font-bold text-xs text-slate-800">{stage.title}</h5>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        stageData?.completed ? 'text-emerald-700 bg-emerald-50' : 'text-slate-400 bg-slate-100'
                      }`}>
                        {stageData?.completed ? 'Selesai' : 'Belum'}
                      </span>
                    </div>
                    {stageData?.completed && stage.fields.map((f) => {
                      const val = answers[f.id];
                      if (val === undefined) return null;
                      return (
                        <div key={f.id} className="bg-slate-50 p-2.5 rounded-xl text-xs mt-2">
                          <p className="text-[10px] text-slate-500 font-bold">{f.label}</p>
                          <p className="text-slate-800 font-medium mt-0.5 whitespace-pre-wrap">
                            {Array.isArray(val) ? val.join(', ') : String(val)}
                          </p>
                        </div>
                      );
                    })}
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
