import React, { useState } from 'react';
import { AppProvider, useApp } from './context';
import { Navbar } from './components/Navbar';
import { JourneyMap } from './components/JourneyMap';
import { ResultView } from './components/ResultView';
import { AdminDashboard } from './components/AdminDashboard';

const MainLayout: React.FC = () => {
  const { currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<'map' | 'result' | 'admin'>(() => {
    return currentUser.role === 'admin' ? 'admin' : 'map';
  });

  // Sync tab when user switches role
  React.useEffect(() => {
    if (currentUser.role === 'admin' && activeTab !== 'admin') {
      setActiveTab('admin');
    } else if (currentUser.role === 'student' && activeTab === 'admin') {
      setActiveTab('map');
    }
  }, [currentUser.role]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-800">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'map' && (
          <JourneyMap onGoToResult={() => setActiveTab('result')} />
        )}

        {activeTab === 'result' && (
          <ResultView onBackToMap={() => setActiveTab('map')} />
        )}

        {activeTab === 'admin' && <AdminDashboard />}
      </main>

      <footer className="no-print border-t border-slate-200 bg-white/80 py-4 text-center text-xs text-slate-400">
        Growth Mindset Journey Map &copy; 2026 • Platform Petualangan Refleksi Diri Siswa (PRD v1.0)
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
