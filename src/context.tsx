import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, StudentJourney } from './types';
import { INITIAL_USERS, INITIAL_JOURNEYS, STAGES_DATA } from './data';

interface AppContextType {
  currentUser: User;
  users: User[];
  journeys: Record<string, StudentJourney>;
  switchUser: (userId: string) => void;
  saveStageAnswer: (userId: string, stageId: number, answers: Record<string, any>) => void;
  getStudentJourney: (userId: string) => StudentJourney;
  simulateGoogleDriveSync: (userId: string) => Promise<string>;
  resetStudentProgress: (userId: string) => void;
}

const STORAGE_KEY_JOURNEYS = 'growth_mindset_journeys_v1';
const STORAGE_KEY_USERS = 'growth_mindset_users_v1';
const STORAGE_KEY_CURRENT_USER = 'growth_mindset_current_user_v1';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_USERS);
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
    return saved || 'student-1';
  });

  const [journeys, setJourneys] = useState<Record<string, StudentJourney>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_JOURNEYS);
    return saved ? JSON.parse(saved) : INITIAL_JOURNEYS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_JOURNEYS, JSON.stringify(journeys));
  }, [journeys]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CURRENT_USER, currentUserId);
  }, [currentUserId]);

  const currentUser = users.find((u) => u.id === currentUserId) || users[0];

  const switchUser = (userId: string) => {
    setCurrentUserId(userId);
  };

  const getStudentJourney = (userId: string): StudentJourney => {
    if (journeys[userId]) {
      return journeys[userId];
    }
    return {
      userId,
      confidenceScore: 50,
      lastActiveStage: 1,
      stages: {},
    };
  };

  const saveStageAnswer = (userId: string, stageId: number, answers: Record<string, any>) => {
    setJourneys((prev) => {
      const current = prev[userId] || {
        userId,
        confidenceScore: 50,
        lastActiveStage: 1,
        stages: {},
      };

      const updatedStages = {
        ...current.stages,
        [stageId]: {
          completed: true,
          completedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          answers,
        },
      };

      // Recalculate confidence score based on stage answers
      let calculatedScore = 50;
      if (answers.confidence_level) {
        calculatedScore = Math.min(100, Math.max(10, answers.confidence_level * 10));
      } else if (answers.effort_score) {
        calculatedScore = Math.min(100, Math.max(10, answers.effort_score * 10));
      } else {
        const completedCount = Object.keys(updatedStages).length;
        calculatedScore = Math.min(100, 50 + completedCount * 6);
      }

      return {
        ...prev,
        [userId]: {
          ...current,
          stages: updatedStages,
          lastActiveStage: Math.min(8, stageId + 1),
          confidenceScore: calculatedScore,
        },
      };
    });
  };

  const simulateGoogleDriveSync = async (userId: string): Promise<string> => {
    const user = users.find((u) => u.id === userId);
    const className = user?.class ? user.class.replace(/\s+/g, '_') : 'Umum';
    const cleanName = user?.name.replace(/\s+/g, '_') || 'Siswa';
    
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const simulatedUrl = `https://drive.google.com/drive/folders/Growth_Mindset_Journey/${className}/${cleanName}_Refleksi.png`;

    setJourneys((prev) => {
      const current = prev[userId];
      if (!current) return prev;
      return {
        ...prev,
        [userId]: {
          ...current,
          driveExportedUrl: simulatedUrl,
          driveExportedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        },
      };
    });

    return simulatedUrl;
  };

  const resetStudentProgress = (userId: string) => {
    setJourneys((prev) => ({
      ...prev,
      [userId]: {
        userId,
        confidenceScore: 40,
        lastActiveStage: 1,
        stages: {},
      },
    }));
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        journeys,
        switchUser,
        saveStageAnswer,
        getStudentJourney,
        simulateGoogleDriveSync,
        resetStudentProgress,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
