import React, { useState } from 'react';
import { AppProvider, useApp } from './context';
import { Navbar } from './components/Navbar';
import { JourneyMap } from './components/JourneyMap';
import { ResultView } from './components/ResultView';
import { AdminDashboard } from './components/AdminDashboard';
import { StudentEntry } from './components/StudentEntry';
import { AdminLoginModal } from './components/AdminLoginModal';
import { Moon, Sun } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { activeStudent, isAdminLoggedIn } = useApp();
  const [activeTab, setActiveTab] = useState<'map' | 'result' | 'admin'>('map');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Load theme preference from localStorage
    const saved = localStorage.getItem('gm_theme_preference');
    return saved ? JSON.parse(saved) : false;
  });

  const htmlElement = document.getElementById('app');

  React.useEffect(() => {
    if (isAdminLoggedIn) {
      setActiveTab('admin');
    } else if (activeTab === 'admin') {
      setActiveTab('map');
    }
  }, [isAdminLoggedIn]);

  // Save theme preference and apply to document - FIX DARK MODE
  React.useEffect(() => {
    localStorage.setItem('gm_theme_preference', String(isDarkMode));
    
    // Apply dark class to the app element
    if (htmlElement) {
      if (isDarkMode) {
        htmlElement.classList.add('dark');
      } else {
        htmlElement.classList.remove('dark');
      }
      console.log('Dark mode applied:', isDarkMode, 'classList:', htmlElement.className);
    }
    
    // Also apply to body for fallback
    const body = document.body;
    if (body) {
      if (isDarkMode) {
        body.classList.add('dark-bg');
      } else {
        body.classList.remove('dark-bg');
      }
    }
  }, [isDarkMode]);

  return (
    <>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAdminLogin={() => setShowAdminModal(true)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
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

      <footer className="no-print border-t border-slate-200 dark:border-slate-700 dark:bg-slate-800/80 py-4 px-4 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors duration-300">
        Growth Mindset Journey Map Percaya Diri &copy; 2026 • Delapan pos untuk mengubah rasa ragu menjadi keberanian bertumbuh — media layanan bimbingan klasikal kelas X
      </footer>
    </>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
