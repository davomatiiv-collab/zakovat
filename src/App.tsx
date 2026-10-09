import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { HomeView } from './views/HomeView.tsx';
import { StudentGameView } from './views/StudentGameView.tsx';
import { TeacherDashboardView } from './views/TeacherDashboardView.tsx';
import { AdminView } from './views/AdminView.tsx';

function MainApp() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [studentJoinCode, setStudentJoinCode] = useState<string>('749201');

  const handleJoinWithCode = (code: string) => {
    setStudentJoinCode(code);
    setCurrentTab('student');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenJoinModal={() => {
          setStudentJoinCode('749201');
          setCurrentTab('student');
        }}
      />

      <main className="flex-1 pb-12">
        {currentTab === 'home' && (
          <HomeView
            onJoinWithCode={handleJoinWithCode}
            onNavigateToTab={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'student' && (
          <StudentGameView
            initialCode={studentJoinCode}
            onExit={() => setCurrentTab('home')}
          />
        )}

        {(currentTab === 'dashboard' ||
          currentTab === 'my-games' ||
          currentTab === 'create-game' ||
          currentTab === 'question-bank' ||
          currentTab === 'live-host') && (
          <TeacherDashboardView
            initialTab={currentTab}
            onJoinAsStudent={handleJoinWithCode}
          />
        )}

        {currentTab === 'admin' && <AdminView />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
