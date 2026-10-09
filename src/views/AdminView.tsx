import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Trophy,
  BookOpen,
  UserCheck,
  CheckCircle,
  PlusCircle,
  Activity,
  Layers,
  Database,
  Trash2,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { User, Game } from '../types/index.ts';

export const AdminView: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New teacher form state
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newSchool, setNewSchool] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [st, uList, gList] = await Promise.all([
        api.getAdminStats(),
        api.getUsers(),
        api.getGames(),
      ]);
      setStats(st);
      setUsers(uList);
      setGames(gList);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newName) return;

    setIsSubmitting(true);
    try {
      await api.register({
        username: newUsername,
        name: newName,
        schoolOrOrg: newSchool,
        role: 'teacher',
      });
      setShowAddTeacher(false);
      setNewUsername('');
      setNewName('');
      setNewSchool('');
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Xatolik');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-purple-500/30 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Administrator Boshqaruv Markazi
            </h1>
            <p className="text-xs text-slate-400">
              O‘qituvchilar hisoblari, o‘yinlar monitoringi va tizim ko‘rsatkichlari
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddTeacher(true)}
          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-600/20 flex items-center space-x-2 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Yangi o‘qituvchi qo‘shish</span>
        </button>
      </div>

      {/* Global Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">O‘qituvchilar</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white">{stats?.totalTeachers || 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Ro‘yxatdan o‘tgan murabbiylar</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Jami o‘yinlar</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white">{stats?.totalGames || 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">O‘tkazilgan va kutilayotgan</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Savollar xazinasi</span>
            <BookOpen className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-black text-white">{stats?.totalBankQuestions || 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Zakovat savollari bazasi</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">O‘quvchilar ishtiroki</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white">{stats?.totalParticipants || 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Jami qatnashgan o‘quvchilar</p>
        </div>
      </div>

      {/* Teachers Directory */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <Users className="w-5 h-5 text-purple-400" />
          <span>O‘qituvchilar va Moderatorlar ro‘yxati</span>
        </h2>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-900 text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">F.I.SH</th>
                  <th className="py-3 px-4">Login</th>
                  <th className="py-3 px-4">Ta’lim muassasasi / Tashkilot</th>
                  <th className="py-3 px-4">Roli</th>
                  <th className="py-3 px-4 text-right">Ro‘yxatdan o‘tgan sana</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-4 font-semibold text-slate-100">{u.name}</td>
                    <td className="py-3 px-4 font-mono text-amber-400">{u.username}</td>
                    <td className="py-3 px-4 text-slate-400">
                      {u.schoolOrOrg || 'Umumiy ta’lim muassasasi'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'admin'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {u.role === 'admin' ? 'Administrator' : 'O‘qituvchi'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 text-xs">
                      {new Date(u.createdAt).toLocaleDateString('uz-UZ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Teacher Modal */}
      {showAddTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Yangi o‘qituvchi hisobini yaratish</h3>
              <button
                onClick={() => setShowAddTeacher(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTeacher} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  O‘qituvchi F.I.SH *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Masalan: Sardor Boboyev"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Login (Username) *
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value.toLowerCase().trim())}
                  placeholder="Masalan: sboboyev"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Maktab / Litsey / Tashkilot
                </label>
                <input
                  type="text"
                  value={newSchool}
                  onChange={(e) => setNewSchool(e.target.value)}
                  placeholder="Masalan: Toshkent sh. 187-maktab"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px]">
                Dastlabki parol: <strong className="font-mono">zakovat123</strong>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddTeacher(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                >
                  Yaratish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
