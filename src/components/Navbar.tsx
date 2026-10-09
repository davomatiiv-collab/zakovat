import React, { useState } from 'react';
import {
  Trophy,
  Brain,
  PlusCircle,
  BookOpen,
  Volume2,
  VolumeX,
  User as UserIcon,
  LogOut,
  ShieldAlert,
  Gamepad2,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { sounds } from '../utils/audio.ts';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenJoinModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, onOpenJoinModal }) => {
  const { user, logout, quickSwitchDemoUser } = useAuth();
  const [isMuted, setIsMuted] = useState(sounds.getIsMuted());
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleToggleSound = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          onClick={() => setCurrentTab('home')}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 p-0.5 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Brain className="w-6 h-6 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-['Cinzel',serif] text-xl font-bold tracking-wider text-amber-400 group-hover:text-amber-300 transition-colors">
                ZAKOVAT
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 -mt-1 hidden sm:block">
              Intellektual O‘yinlar Platformasi
            </p>
          </div>
        </div>

        {/* Navigation Links for Teacher / Admin */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
          <button
            onClick={() => setCurrentTab('home')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              currentTab === 'home'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Bosh sahifa
          </button>

          {user && (user.role === 'teacher' || user.role === 'admin') && (
            <>
              <button
                onClick={() => setCurrentTab('my-games')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  currentTab === 'my-games'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Mening o‘yinlarim</span>
              </button>

              <button
                onClick={() => setCurrentTab('create-game')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  currentTab === 'create-game'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>Yangi o‘yin</span>
              </button>

              <button
                onClick={() => setCurrentTab('question-bank')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  currentTab === 'question-bank'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <BookOpen className="w-4 h-4 text-sky-400" />
                <span>Savollar banki</span>
              </button>
            </>
          )}

          {user?.role === 'admin' && (
            <button
              onClick={() => setCurrentTab('admin')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'admin'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-purple-400" />
              <span>Admin paneli</span>
            </button>
          )}
        </nav>

        {/* Right Action buttons */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Join Game PIN button */}
          <button
            onClick={() => {
              if (onOpenJoinModal) onOpenJoinModal();
              else setCurrentTab('join-game');
            }}
            className="flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-amber-500/20 hover:scale-102 transition-all cursor-pointer"
          >
            <Gamepad2 className="w-4 h-4" />
            <span>O‘yinga qo‘shilish</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            title={isMuted ? 'Ovozni yoqish' : 'Ovozni o‘chirish'}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-slate-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-amber-400" />
            )}
          </button>

          {/* User Account / Role switcher */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-sm transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-slate-700 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-xs">
                {user ? user.name.charAt(0) : 'U'}
              </div>
              <div className="hidden lg:block text-left text-xs">
                <p className="font-semibold text-slate-200 truncate max-w-[120px]">
                  {user ? user.name.split(' ')[0] : 'Kirish'}
                </p>
                <p className="text-[10px] text-amber-400 capitalize">
                  {user ? (user.role === 'admin' ? 'Admin' : 'O‘qituvchi') : 'Mehmon'}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 text-slate-200">
                <div className="px-3 py-2 border-b border-slate-800 mb-2">
                  <p className="font-bold text-sm text-white">{user?.name || 'Tizim foydalanuvchisi'}</p>
                  <p className="text-xs text-amber-400 mt-0.5">
                    {user?.role === 'admin'
                      ? 'Tizim Administratori'
                      : user?.role === 'teacher'
                      ? 'Zakovat Murabbiyi / O‘qituvchi'
                      : 'O‘quvchi'}
                  </p>
                  {user?.schoolOrOrg && (
                    <p className="text-[11px] text-slate-400 truncate mt-1">
                      {user.schoolOrOrg}
                    </p>
                  )}
                </div>

                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1">
                  Tezkor profil almashtirish (Demo):
                </div>

                <button
                  onClick={() => {
                    quickSwitchDemoUser('muallim');
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-slate-800 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <UserIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span>Rustam Qosimov</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    O‘qituvchi
                  </span>
                </button>

                <button
                  onClick={() => {
                    quickSwitchDemoUser('tarixchi');
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-slate-800 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                    <span>Dilnoza Karimova</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    Tarixchi
                  </span>
                </button>

                <button
                  onClick={() => {
                    quickSwitchDemoUser('admin');
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-slate-800 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                    <span>Akmal Saidov</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Admin
                  </span>
                </button>

                <div className="border-t border-slate-800 my-1"></div>

                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 flex items-center space-x-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Chiqish</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
