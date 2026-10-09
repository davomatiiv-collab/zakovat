import React, { useState } from 'react';
import {
  Brain,
  Trophy,
  Clock,
  Sparkles,
  Users,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Gamepad2,
  LogIn,
  BookOpen,
  HelpCircle,
  Award,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface HomeViewProps {
  onJoinWithCode: (code: string) => void;
  onNavigateToTab: (tab: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onJoinWithCode, onNavigateToTab }) => {
  const { user, login, register, quickSwitchDemoUser } = useAuth();
  const [pinCode, setPinCode] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Auth form
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authSchool, setAuthSchool] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinCode.trim()) {
      onJoinWithCode(pinCode.trim());
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmittingAuth(true);

    try {
      if (isRegisterMode) {
        await register({
          username: authUsername.trim(),
          name: authName.trim(),
          schoolOrOrg: authSchool.trim(),
          role: 'teacher',
        });
      } else {
        await login(authUsername.trim(), authPassword.trim());
      }
      setShowAuthModal(false);
    } catch (err: any) {
      setAuthError(err.message || 'Xatolik yuz berdi');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Background radial gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        {/* HERO SECTION */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs sm:text-sm font-semibold mb-6 shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>O‘zbekiston Intellektual O‘yinlar Klubi Standartlari Asosida</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black font-['Cinzel',serif] tracking-tight text-white mb-6 leading-tight">
            BILIM VA TAFAKKUR <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">
              MAYDONI — ZAKOVAT
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            O‘qituvchilar uchun real vaqtda savollar berish va baholash, o‘quvchilar uchun esa 60
            soniyalik intellektual janglarda qatnashish imkonini beruvchi interaktiv tizim.
          </p>

          {/* Quick PIN Input Card */}
          <div className="max-w-md mx-auto bg-slate-900/90 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
            <div className="text-left mb-4">
              <span className="text-xs uppercase font-extrabold tracking-wider text-amber-400 flex items-center space-x-1.5">
                <Gamepad2 className="w-4 h-4" />
                <span>O‘yinga tezkor qo‘shilish</span>
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                O‘qituvchi bergan 6 xonali o‘yin kodini kiriting
              </p>
            </div>

            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\s+/g, ''))}
                  placeholder="PIN kod: 749201"
                  maxLength={8}
                  className="w-full text-center text-3xl font-mono font-black tracking-widest px-4 py-3.5 bg-slate-950 border border-slate-700 rounded-2xl text-amber-300 placeholder:text-slate-600 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-base shadow-xl shadow-amber-500/25 flex items-center justify-center space-x-2 transition-all hover:scale-101 active:scale-98 cursor-pointer"
              >
                <span>O‘yinga kirish</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500">Namunaviy o‘yin kodi:</span>
              <button
                onClick={() => {
                  setPinCode('749201');
                  onJoinWithCode('749201');
                }}
                className="font-mono text-amber-400 font-bold hover:underline"
              >
                749201 (Sinab ko‘rish)
              </button>
            </div>
          </div>
        </div>

        {/* Action Shortcuts for Teachers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div
            onClick={() => onNavigateToTab('create-game')}
            className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 hover:border-amber-500/50 hover:bg-slate-850/80 transition-all cursor-pointer group shadow-lg"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-amber-300 transition-colors">
              Yangi o‘yin yaratish
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sinf yoki guruh uchun o‘z savollaringizni kiriting, 60 soniyalik taymerni belgilang va
              o‘yin kodi oling.
            </p>
          </div>

          <div
            onClick={() => onNavigateToTab('question-bank')}
            className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 hover:border-sky-500/50 hover:bg-slate-850/80 transition-all cursor-pointer group shadow-lg"
          >
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-4 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-sky-300 transition-colors">
              Savollar banki
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tarix, Adabiyot, Mantiq va Fan sohalari bo‘yicha saralangan Zakovat savollaridan
              foydalaning.
            </p>
          </div>

          <div
            onClick={() => onNavigateToTab('my-games')}
            className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 hover:border-emerald-500/50 hover:bg-slate-850/80 transition-all cursor-pointer group shadow-lg"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-emerald-300 transition-colors">
              Jonli boshqaruv zali
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ishtirokchilar javoblarini real vaqt rejimida qabul qiling, avtomatik baholang va
              natijalarni e’lon qiling.
            </p>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 sm:p-12 mb-16">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
              Platformaning asosiy imkoniyatlari
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Texnik topshiriqda belgilangan barcha talablar yuqori aniqlikda joriy qilingan
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <Clock className="w-6 h-6 text-amber-400" />
              <h4 className="font-bold text-white text-sm">Server sinxron taymeri</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Taymer server vaqti asosida ishlaydi. Sahifa yangilansa ham vaqt aynan bir xil
                qoladi. Vaqt tugagach yangi javoblar qabul qilinmaydi.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <h4 className="font-bold text-white text-sm">Aqlli baholash tizimi</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tizim o‘quvchilar javoblarini avtomatik solishtiradi. O‘qituvchi esa har bir javobni
                qo‘lda tasdiqlashi yoki ballni to‘g‘irlashi mumkin.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <Users className="w-6 h-6 text-sky-400" />
              <h4 className="font-bold text-white text-sm">Maxfiylik va halollik</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                O‘yin davomida boshqa ishtirokchilarning javoblari yashirin bo‘ladi. Har bir
                o‘quvchi o‘z ekrani bilan ishlaydi.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <Award className="w-6 h-6 text-purple-400" />
              <h4 className="font-bold text-white text-sm">Jonli reyting jadvali</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                To‘g‘ri javoblar, xatolar, ballar va javob berish tezligi hisoblanib, adolatli
                pedestal va reyting shakllanadi.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-500">
          <p>© 2026 “Zakovat” — Interaktiv Intellektual O‘yin Platformasi.</p>
          <p className="mt-1">
            O‘zbekiston Respublikasi umumta’lim maktablari, litseylar va universitetlar uchun
            mo‘ljallangan.
          </p>
        </div>
      </div>

      {/* Auth Modal (Login / Register) */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">
                {isRegisterMode ? 'O‘qituvchi sifatida ro‘yxatdan o‘tish' : 'Tizimga kirish'}
              </h3>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {authError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {isRegisterMode && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                      F.I.SH *
                    </label>
                    <input
                      type="text"
                      required
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="Masalan: Dilnoza Karimova"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                      Maktab / Tashkilot
                    </label>
                    <input
                      type="text"
                      value={authSchool}
                      onChange={(e) => setAuthSchool(e.target.value)}
                      placeholder="Masalan: Samarqand sh. 21-son maktab"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs outline-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Login *
                </label>
                <input
                  type="text"
                  required
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  placeholder="Login"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Parol *
                </label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Parol"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
              >
                {isRegisterMode ? "Ro'yxatdan o'tish" : 'Kirish'}
              </button>
            </form>

            <div className="pt-2 text-center text-xs text-slate-400">
              {isRegisterMode ? (
                <button
                  onClick={() => setIsRegisterMode(false)}
                  className="text-amber-400 hover:underline"
                >
                  Profilingiz bormi? Tizimga kiring
                </button>
              ) : (
                <button
                  onClick={() => setIsRegisterMode(true)}
                  className="text-amber-400 hover:underline"
                >
                  Yangi o‘qituvchi? Ro‘yxatdan o‘ting
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
