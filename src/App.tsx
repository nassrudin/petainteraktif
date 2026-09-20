import React, { useState } from 'react';
import { AppProvider, useApp } from './context';
import { Navbar } from './components/Navbar';
import { JourneyMap } from './components/JourneyMap';
import { ResultView } from './components/ResultView';
import { AdminDashboard } from './components/AdminDashboard';
import { StudentEntry } from './components/StudentEntry';
import { AdminLoginModal } from './components/AdminLoginModal';

const MainLayout: React.FC = () => {
  const { activeStudent, isAdminLoggedIn } = useApp();
  const [activeTab, setActiveTab] = useState<'map' | 'result' | 'admin'>('map');
  const [showAdminModal, setShowAdminModal] = useState(false);

  React.useEffect(() => {
    if (isAdminLoggedIn) {
      setActiveTab('admin');
    } else if (activeTab === 'admin') {
      setActiveTab('map');
    }
  }, [isAdminLoggedIn]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-800">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAdminLogin={() => setShowAdminModal(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {isAdminLoggedIn ? (
          <AdminDashboard />
        ) : !activeStudent ? (
          <StudentEntry onAdminClick={() => setShowAdminModal(true)} />
        ) : (
          <>
            {activeTab === 'map' && (
              <JourneyMap onGoToResult={() => setActiveTab('result')} />
            )}
            {activeTab === 'result' && (
              <ResultView onBackToMap={() => setActiveTab('map')} />
            )}
          </>
        )}
      </main>

      <AdminLoginModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onSuccess={() => setActiveTab('admin')}
      />

      <footer className="no-print border-t border-slate-200 bg-white/80 py-4 px-4 text-center text-xs text-slate-500">
        Growth Mindset Journey Map Percaya Diri &copy; 2026 • Delapan pos untuk mengubah rasa ragu menjadi keberanian bertumbuh — media layanan bimbingan klasikal kelas X
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
