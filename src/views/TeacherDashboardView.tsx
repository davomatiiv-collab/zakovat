import React, { useState, useEffect } from 'react';
import {
  Trophy,
  PlusCircle,
  BookOpen,
  Play,
  Pause,
  SkipForward,
  CheckCircle,
  XCircle,
  HelpCircle,
  Users,
  Copy,
  Trash2,
  Edit,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Search,
  Check,
  Award,
  Layers,
  BarChart3,
  Share2,
  ExternalLink,
  Sliders,
  AlertTriangle,
  FolderPlus,
  Eye,
  CheckCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Game,
  Question,
  BankQuestion,
  Participant,
  Answer,
  LeaderboardEntry,
} from '../types/index.ts';
import { api, realtime } from '../services/api.ts';
import { sounds } from '../utils/audio.ts';
import { aiVoice } from '../utils/aiVoice.ts';

interface TeacherDashboardViewProps {
  initialTab?: string;
  onOpenLiveGame?: (gameId: string) => void;
  onJoinAsStudent?: (code: string) => void;
}

export const TeacherDashboardView: React.FC<TeacherDashboardViewProps> = ({
  initialTab = 'dashboard',
  onOpenLiveGame,
  onJoinAsStudent,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);

  // Data states
  const [games, setGames] = useState<Game[]>([]);
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Host Game State (When teacher is running a live game)
  const [hostGameId, setHostGameId] = useState<string | null>(null);
  const [hostGame, setHostGame] = useState<Game | null>(null);
  const [hostParticipants, setHostParticipants] = useState<Participant[]>([]);
  const [hostAnswers, setHostAnswers] = useState<Answer[]>([]);
  const [hostLeaderboard, setHostLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [hostTimeLeft, setHostTimeLeft] = useState<number>(60);
  const [copyCodeSuccess, setCopyCodeSuccess] = useState(false);

  // AI Voice & Question Generation States
  const [isHostAiSpeaking, setIsHostAiSpeaking] = useState(false);
  const [autoHostAiSpeak, setAutoHostAiSpeak] = useState(aiVoice.isAutoSpeakEnabled());
  const [hostVoice, setHostVoice] = useState(aiVoice.getVoice());
  const [isGeneratingAiQuestion, setIsGeneratingAiQuestion] = useState(false);

  // Quick Launch 1-Click Game States
  const [quickQuestionText, setQuickQuestionText] = useState(
    "Ushbu buyum qadimda Xitoyda kashf etilgan bo'lib, dastlab 'janubni ko'rsatuvchi qoshiq' deb atalgan. Keyinchalik u dengizchilarning eng muhim asbobiga aylandi. Diqqat, savol: gap nima haqida bormoqda?"
  );
  const [quickCorrectAnswer, setQuickCorrectAnswer] = useState("Kompas");
  const [quickExplanation, setQuickExplanation] = useState(
    "Kompas qadimgi Xitoyda magnit toshidan yasalgan qoshiq shaklida bo'lgan."
  );
  const [quickTimeSec, setQuickTimeSec] = useState<number>(60);
  const [isLaunchingQuickGame, setIsLaunchingQuickGame] = useState(false);

  useEffect(() => {
    const unsub = aiVoice.subscribe((speaking) => {
      setIsHostAiSpeaking(speaking);
    });
    return () => {
      unsub();
    };
  }, []);

  // Create Game Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newDefaultTime, setNewDefaultTime] = useState<number>(60);
  const [newDefaultPoints, setNewDefaultPoints] = useState<number>(1);
  const [newAllowEdit, setNewAllowEdit] = useState(true);
  const [newQuestions, setNewQuestions] = useState<Question[]>([]);
  const [isCreatingGame, setIsCreatingGame] = useState(false);

  // Bank Question Filter & Add modal
  const [bankCategory, setBankCategory] = useState<string>('all');
  const [bankSearch, setBankSearch] = useState<string>('');
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [newBankText, setNewBankText] = useState('');
  const [newBankAnswer, setNewBankAnswer] = useState('');
  const [newBankExplanation, setNewBankExplanation] = useState('');
  const [newBankCategory, setNewBankCategory] = useState('Fan va texnika');
  const [newBankDifficulty, setNewBankDifficulty] = useState<'oson' | 'orta' | 'qiyin'>('orta');

  // Load initial data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [gList, bqList] = await Promise.all([
        api.getGames(user?.role === 'admin' ? undefined : user?.id),
        api.getBankQuestions(),
      ]);
      setGames(gList);
      setBankQuestions(bqList);
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  // Sync tab with props
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // Load live game details if hostGameId selected
  const loadHostGame = async (gameId: string) => {
    try {
      const data = await api.getGame(gameId);
      setHostGame(data.game);
      setHostParticipants(data.participants);
      setHostAnswers(data.answers);
      setHostLeaderboard(data.leaderboard);
      setHostGameId(gameId);
      setActiveTab('live-host');

      // Subscribe to WS
      realtime.joinRoom({
        gameId: data.game.id,
        gameCode: data.game.code,
        role: 'teacher',
        name: user?.name,
      });
    } catch (e) {
      console.error('Failed to load host game:', e);
    }
  };

  // Real-time updates for host game
  useEffect(() => {
    if (!hostGameId) return;

    const unsubGameState = realtime.on('game_state', (payload) => {
      if (payload.game?.id === hostGameId) {
        setHostGame(payload.game);
        if (payload.leaderboard) setHostLeaderboard(payload.leaderboard);
        if (payload.participants) setHostParticipants(payload.participants);
        if (payload.answers) setHostAnswers(payload.answers);
      }
    });

    const unsubPartJoined = realtime.on('participant_joined', (payload) => {
      setHostParticipants((prev) => {
        if (prev.some((p) => p.id === payload.participant.id)) return prev;
        return [...prev, payload.participant];
      });
    });

    const unsubAnswerReceived = realtime.on('answer_received', (payload) => {
      setHostAnswers((prev) => {
        const idx = prev.findIndex((a) => a.id === payload.answer.id);
        if (idx !== -1) {
          const clone = [...prev];
          clone[idx] = payload.answer;
          return clone;
        }
        return [...prev, payload.answer];
      });
    });

    const unsubAnswerEvaluated = realtime.on('answer_evaluated', (payload) => {
      setHostAnswers((prev) => {
        return prev.map((a) => (a.id === payload.answer.id ? payload.answer : a));
      });
      if (payload.leaderboard) setHostLeaderboard(payload.leaderboard);
    });

    const unsubQuestionChanged = realtime.on('question_changed', (payload) => {
      if (payload.game?.id === hostGameId) {
        setHostGame(payload.game);
        if (payload.leaderboard) setHostLeaderboard(payload.leaderboard);
      }
    });

    const unsubGameFinished = realtime.on('game_finished', (payload) => {
      if (payload.game?.id === hostGameId) {
        setHostGame(payload.game);
        if (payload.leaderboard) setHostLeaderboard(payload.leaderboard);
      }
    });

    return () => {
      unsubGameState();
      unsubPartJoined();
      unsubAnswerReceived();
      unsubAnswerEvaluated();
      unsubQuestionChanged();
      unsubGameFinished();
    };
  }, [hostGameId]);

  // Host synchronized timer tick
  useEffect(() => {
    if (!hostGame || hostGame.status !== 'in_progress' || !hostGame.questionDeadline) {
      if (hostGame?.status === 'evaluating' || hostGame?.status === 'finished') {
        setHostTimeLeft(0);
      }
      return;
    }

    const interval = setInterval(() => {
      if (hostGame.isTimerPaused) {
        setHostTimeLeft(Math.max(0, Math.ceil((hostGame.timerRemainingMs || 0) / 1000)));
        return;
      }

      const diff = hostGame.questionDeadline! - Date.now();
      const secs = Math.max(0, Math.ceil(diff / 1000));
      setHostTimeLeft(secs);

      if (secs === 0 && hostGame.status === 'in_progress') {
        setHostGame((prev) => (prev ? { ...prev, status: 'evaluating' } : null));
      }
    }, 250);

    return () => clearInterval(interval);
  }, [hostGame?.status, hostGame?.questionDeadline, hostGame?.isTimerPaused]);

  // Host Action Handlers
  const handleStartGame = async () => {
    if (!hostGame) return;
    try {
      sounds.playGong();
      const res = await api.startGame(hostGame.id);
      setHostGame(res.game);
      if (res.game.questions && res.game.questions[0]) {
        aiVoice.speakQuestion(res.game.questions[0].text, 1);
      }
    } catch (err: any) {
      alert(err.message || 'Xatolik yuz berdi');
    }
  };

  const handlePauseResume = async () => {
    if (!hostGame) return;
    try {
      if (hostGame.isTimerPaused) {
        const res = await api.resumeGame(hostGame.id);
        setHostGame(res.game);
      } else {
        aiVoice.stopSpeaking();
        const res = await api.pauseGame(hostGame.id);
        setHostGame(res.game);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEndTimerEarly = async () => {
    if (!hostGame) return;
    try {
      aiVoice.stopSpeaking();
      sounds.playTimeUp();
      const res = await api.endTimerEarly(hostGame.id);
      setHostGame(res.game);
    } catch (e) {
      console.error(e);
    }
  };

  const handleNextQuestion = async () => {
    if (!hostGame) return;
    try {
      aiVoice.stopSpeaking();
      sounds.playGong();
      const res = await api.nextQuestion(hostGame.id);
      setHostGame(res.game);
      const nextQ = res.game.questions[res.game.currentQuestionIndex];
      if (nextQ) {
        aiVoice.speakQuestion(nextQ.text, res.game.currentQuestionIndex + 1);
      }
    } catch (err: any) {
      alert(err.message || 'Xatolik yuz berdi');
    }
  };

  // Quick Launch Handlers
  const handlePickRandomBankQuestion = () => {
    if (bankQuestions.length === 0) return;
    const randomQ = bankQuestions[Math.floor(Math.random() * bankQuestions.length)];
    setQuickQuestionText(randomQ.text);
    setQuickCorrectAnswer(randomQ.correctAnswer);
    setQuickExplanation(randomQ.explanation || '');
    sounds.playCorrect();
  };

  const handleGenerateQuickAIQuestion = async () => {
    setIsGeneratingAiQuestion(true);
    try {
      const bq = await api.generateAIQuestion('Mantiq', 'orta');
      setQuickQuestionText(bq.text);
      setQuickCorrectAnswer(bq.correctAnswer);
      setQuickExplanation(bq.explanation || '');
      sounds.playCorrect();
    } catch (e: any) {
      alert(e.message || 'AI savol yaratishda xatolik yuz berdi');
    } finally {
      setIsGeneratingAiQuestion(false);
    }
  };

  const handleQuickLaunch = async () => {
    if (!quickQuestionText.trim() || !quickCorrectAnswer.trim()) {
      alert('Iltimos, savol matni va to‘g‘ri javobni kiriting!');
      return;
    }

    setIsLaunchingQuickGame(true);
    try {
      sounds.playGong();
      const firstActiveGame = hostGameId
        ? hostGameId
        : games.find((g) => g.status === 'in_progress' || g.status === 'waiting')?.id;

      const res = await api.quickStartGame({
        teacherId: user?.id,
        teacherName: user?.name,
        questionText: quickQuestionText.trim(),
        correctAnswer: quickCorrectAnswer.trim(),
        explanation: quickExplanation.trim(),
        timeLimitSec: quickTimeSec,
        gameId: firstActiveGame,
      });

      setHostGame(res.game);
      setHostGameId(res.game.id);
      setActiveTab('live-host');

      // AI Voice immediately reads out the question in the realistic boy's voice!
      aiVoice.speakQuestion(quickQuestionText.trim(), res.game.currentQuestionIndex + 1, {
        voice: hostVoice,
      });
    } catch (err: any) {
      alert(err.message || 'Xatolik yuz berdi');
    } finally {
      setIsLaunchingQuickGame(false);
    }
  };

  const handleFinishGame = async () => {
    if (!hostGame) return;
    try {
      aiVoice.stopSpeaking();
      const res = await api.finishGame(hostGame.id);
      setHostGame(res.game);
      confetti({ particleCount: 120, spread: 80 });
      sounds.playVictoryFanfare();

      if (hostLeaderboard.length > 0) {
        const topWinner = hostLeaderboard[0];
        aiVoice.speakAnnouncement(
          `O‘yin yakunlandi! 1-o‘rin g‘olibi: ${topWinner.name}, to‘plagan bali: ${topWinner.score} ball! Barcha ishtirokchilarga tashakkur!`
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // AI Question Generation Handlers
  const handleGenerateAIQuestion = async (category = 'Mantiq') => {
    setIsGeneratingAiQuestion(true);
    try {
      const bq = await api.generateAIQuestion(category, 'orta');
      const newQ: Question = {
        id: `q-ai-${Date.now()}`,
        order: newQuestions.length + 1,
        text: bq.text,
        correctAnswer: bq.correctAnswer,
        explanation: bq.explanation,
        timeLimitSec: newDefaultTime,
        points: newDefaultPoints,
        category: bq.category,
      };
      setNewQuestions([...newQuestions, newQ]);
      sounds.playCorrect();
    } catch (err: any) {
      alert(err.message || 'AI savol yaratishda xatolik yuz berdi');
    } finally {
      setIsGeneratingAiQuestion(false);
    }
  };

  const handleGenerateAIQuestionForBank = async () => {
    setIsGeneratingAiQuestion(true);
    try {
      const bq = await api.generateAIQuestion(newBankCategory || 'Tarix', newBankDifficulty);
      setNewBankText(bq.text);
      setNewBankAnswer(bq.correctAnswer);
      setNewBankExplanation(bq.explanation || '');
      sounds.playCorrect();
    } catch (err: any) {
      alert(err.message || 'AI savol yaratishda xatolik yuz berdi');
    } finally {
      setIsGeneratingAiQuestion(false);
    }
  };

  const handlePublishResults = async () => {
    if (!hostGame) return;
    try {
      const res = await api.publishResults(hostGame.id);
      setHostGame(res.game);
      setHostLeaderboard(res.leaderboard);
      confetti({ particleCount: 150, spread: 90 });
      sounds.playVictoryFanfare();

      if (res.leaderboard && res.leaderboard.length > 0) {
        const topWinner = res.leaderboard[0];
        aiVoice.speakAnnouncement(
          `Natijalar e’lon qilindi! 1-o‘rin sohibi: ${topWinner.name}, to‘plagan bali: ${topWinner.score} ball! Tabriklaymiz!`,
          { force: true }
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkAutoReview = async () => {
    if (!hostGame) return;
    const currentQ = hostGame.questions[hostGame.currentQuestionIndex];
    if (!currentQ) return;
    try {
      const res = await api.bulkAutoReview(hostGame.id, currentQ.id);
      if (res.leaderboard) setHostLeaderboard(res.leaderboard);
      // reload answers
      const updated = await api.getGame(hostGame.id);
      setHostAnswers(updated.answers);
      sounds.playCorrect();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReviewAnswer = async (
    answerId: string,
    status: 'correct' | 'wrong' | 'partial',
    points: number
  ) => {
    if (!hostGame) return;
    try {
      const res = await api.reviewAnswer(hostGame.id, answerId, status, points);
      setHostAnswers((prev) => prev.map((a) => (a.id === answerId ? res.answer : a)));
      if (res.leaderboard) setHostLeaderboard(res.leaderboard);
      if (status === 'correct') sounds.playSubmit();
    } catch (e) {
      console.error(e);
    }
  };

  const handleKickParticipant = async (participantId: string) => {
    if (!hostGame) return;
    if (confirm("Ushbu o'quvchini o'yindan chetlatmoqchimisiz?")) {
      await api.kickParticipant(hostGame.id, participantId);
      setHostParticipants((prev) => prev.filter((p) => p.id !== participantId));
    }
  };

  const handleCopyCode = () => {
    if (!hostGame) return;
    navigator.clipboard.writeText(hostGame.code);
    setCopyCodeSuccess(true);
    setTimeout(() => setCopyCodeSuccess(false), 2000);
  };

  // Create Game Wizard Actions
  const handleAddQuestionFromScratch = () => {
    const newQ: Question = {
      id: `q-new-${Date.now()}`,
      order: newQuestions.length + 1,
      text: '',
      correctAnswer: '',
      explanation: '',
      timeLimitSec: newDefaultTime,
      points: newDefaultPoints,
      category: 'Umumiy',
    };
    setNewQuestions([...newQuestions, newQ]);
  };

  const handleImportBankQuestion = (bq: BankQuestion) => {
    if (newQuestions.some((q) => q.text === bq.text)) {
      alert("Bu savol allaqachon to'plamga kiritilgan");
      return;
    }
    const newQ: Question = {
      id: `q-imp-${Date.now()}-${bq.id}`,
      order: newQuestions.length + 1,
      text: bq.text,
      correctAnswer: bq.correctAnswer,
      explanation: bq.explanation,
      timeLimitSec: bq.suggestedTimeSec || newDefaultTime,
      points: bq.points || newDefaultPoints,
      category: bq.category,
    };
    setNewQuestions([...newQuestions, newQ]);
  };

  const handleSaveNewGame = async () => {
    if (!newTitle.trim()) {
      alert("Iltimos, o'yin nomini kiriting");
      return;
    }
    if (newQuestions.length === 0) {
      alert("O'yinga kamida 1 ta savol qo'shing");
      return;
    }

    setIsCreatingGame(true);
    try {
      const created = await api.createGame({
        title: newTitle.trim(),
        description: newDescription.trim(),
        groupName: newGroupName.trim(),
        teacherId: user?.id,
        teacherName: user?.name,
        questions: newQuestions,
        settings: {
          defaultTimeLimitSec: newDefaultTime,
          defaultPoints: newDefaultPoints,
          allowAnswerEdit: newAllowEdit,
          autoProgress: false,
          caseSensitiveCheck: false,
          showLeaderboardAfterEachQuestion: true,
          revealExplanation: true,
        },
      });

      setGames([created, ...games]);
      // Reset form
      setNewTitle('');
      setNewDescription('');
      setNewGroupName('');
      setNewQuestions([]);
      // Open the new game host view
      loadHostGame(created.id);
    } catch (e: any) {
      alert(e.message || "O'yin yaratishda xatolik");
    } finally {
      setIsCreatingGame(false);
    }
  };

  // Add question to bank
  const handleSaveBankQuestion = async () => {
    if (!newBankText.trim() || !newBankAnswer.trim()) {
      alert("Savol matni va to'g'ri javob kiritilishi shart");
      return;
    }

    try {
      const created = await api.createBankQuestion({
        text: newBankText.trim(),
        correctAnswer: newBankAnswer.trim(),
        explanation: newBankExplanation.trim(),
        category: newBankCategory,
        difficulty: newBankDifficulty,
        suggestedTimeSec: 60,
        points: 1,
      });
      setBankQuestions([created, ...bankQuestions]);
      setShowAddBankModal(false);
      setNewBankText('');
      setNewBankAnswer('');
      setNewBankExplanation('');
    } catch (e: any) {
      alert(e.message || 'Xatolik yuz berdi');
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    if (confirm("Haqiqatan ham ushbu o'yinni o'chirmoqchimisiz?")) {
      await api.deleteGame(gameId);
      setGames(games.filter((g) => g.id !== gameId));
      if (hostGameId === gameId) {
        setHostGameId(null);
        setHostGame(null);
        setActiveTab('my-games');
      }
    }
  };

  const handleDuplicateGame = async (gameId: string) => {
    try {
      const duplicated = await api.duplicateGame(gameId);
      setGames([duplicated, ...games]);
      alert(`"${duplicated.title}" nusxasi yaratildi! Kodi: ${duplicated.code}`);
    } catch (e: any) {
      alert(e.message || 'Nusxa olishda xatolik');
    }
  };

  // Categories list
  const categories = [
    'all',
    'Tarix',
    'Adabiyot',
    'Mantiq',
    'Fan va texnika',
    'Geografiya',
    'San\'at',
    'Biologiya',
    'Tibbiyot',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Tab Header Sub-navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Bosh sahifa
          </button>

          <button
            onClick={() => setActiveTab('my-games')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'my-games'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Mening o‘yinlarim ({games.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('create-game')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'create-game'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Yangi o‘yin yaratish</span>
          </button>

          <button
            onClick={() => setActiveTab('question-bank')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'question-bank'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Savollar banki ({bankQuestions.length})</span>
          </button>

          {hostGame && (
            <button
              onClick={() => setActiveTab('live-host')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold animate-pulse transition-all ${
                activeTab === 'live-host'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
              <span>Jonli boshqaruv: {hostGame.code}</span>
            </button>
          )}
        </div>

        {/* Quick action button */}
        <button
          onClick={() => {
            // Pick default demo game if exists, else first game
            const demo = games.find((g) => g.code === '749201') || games[0];
            if (demo) loadHostGame(demo.id);
            else setActiveTab('create-game');
          }}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Namunaviy o‘yinni ochish</span>
        </button>
      </div>

      {/* TAB 1: Bosh sahifa (Dashboard Overview) */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="max-w-2xl">
              <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                O‘qituvchi Boshqaruv Markazi
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white mt-3 mb-2">
                Xush kelibsiz, {user?.name || 'Hurmatli O‘qituvchi'}!
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                Zakovat platformasi orqali sinfingiz yoki to‘garagingiz uchun intellektual
                turnirlarni 1 daqiqada tashkil eting, real vaqtda taymerni boshqaring va javoblarni
                avtomatlashtirilgan tarzda baholang.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setActiveTab('create-game')}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 flex items-center space-x-2 transition-all cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Yangi o‘yin tashkil qilish</span>
                </button>
                <button
                  onClick={() => setActiveTab('question-bank')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-all cursor-pointer"
                >
                  Savollar bankini ko‘rish
                </button>
              </div>
            </div>
          </div>

          {/* QUICK 1-CLICK QUESTION & START CARD */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
              <div>
                <div className="inline-flex items-center space-x-2 text-xs uppercase font-extrabold tracking-widest text-amber-400 mb-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Sodda va Tezkor Rejim</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Savol bering va o‘yinni 1 bosishda boshlang
                </h2>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  Savolni kiriting va <strong className="text-emerald-400">"O‘yinni boshlash"</strong> tugmasini bosing. O‘yin darhol boshlanadi, vaqt avtomatik sanala boshlaydi va AI savolni o‘g‘il bola ovozida jarangdor o‘qib beradi!
                </p>
              </div>

              {/* Game PIN badge for quick sharing */}
              <div className="flex items-center space-x-3 bg-slate-950 border border-amber-500/40 rounded-2xl p-3 px-5 shadow-inner shrink-0">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">
                    O‘quvchilar uchun PIN kod:
                  </span>
                  <span className="font-mono text-2xl font-black tracking-widest text-amber-400">
                    {games[0]?.code || '749201'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(games[0]?.code || '749201');
                    alert(`PIN kod (${games[0]?.code || '749201'}) nusxalandi!`);
                  }}
                  title="PIN kodni nusxalash"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Form */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Savol matni *
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handlePickRandomBankQuestion}
                      className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center space-x-1 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Bankdan tasodifiy olish</span>
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      disabled={isGeneratingAiQuestion}
                      onClick={handleGenerateQuickAIQuestion}
                      className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isGeneratingAiQuestion ? 'AI tuzmoqda...' : 'AI orqali yangilash'}</span>
                    </button>
                  </div>
                </div>

                <textarea
                  value={quickQuestionText}
                  onChange={(e) => setQuickQuestionText(e.target.value)}
                  rows={3}
                  placeholder="Zakovat savoli matnini shu yerga yozing..."
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-slate-100 placeholder:text-slate-600 text-sm sm:text-base focus:border-amber-400 outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    To‘g‘ri javob *
                  </label>
                  <input
                    type="text"
                    value={quickCorrectAnswer}
                    onChange={(e) => setQuickCorrectAnswer(e.target.value)}
                    placeholder="Masalan: Kompas"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-emerald-300 font-bold text-sm focus:border-emerald-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Javob vaqti (Taymer)
                  </label>
                  <select
                    value={quickTimeSec}
                    onChange={(e) => setQuickTimeSec(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-sm focus:border-amber-400 outline-none cursor-pointer"
                  >
                    <option value={30}>30 soniya (Tezkor)</option>
                    <option value={45}>45 soniya</option>
                    <option value={60}>60 soniya (Klassik Zakovat)</option>
                    <option value={90}>90 soniya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    AI Ovoz (O‘g‘il bola)
                  </label>
                  <select
                    value={hostVoice}
                    onChange={(e) => {
                      const v = e.target.value;
                      setHostVoice(v);
                      aiVoice.setVoice(v);
                    }}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-amber-300 text-sm focus:border-amber-400 outline-none cursor-pointer"
                  >
                    <option value="Puck">👦 Jasur (Haqiqiy o‘g‘il bola ovozi - Jonli)</option>
                    <option value="Zephyr">🎙️ Sardor (Yosh yigit ovozi - Ravon)</option>
                    <option value="Charon">🧔 Bobur (Rasmiy erkak ovozi)</option>
                  </select>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-slate-400">
                  ⚡ Tugmani bosishingiz bilan barcha o‘quvchilarda savol ochiladi va taymer yuradi.
                </span>

                <button
                  type="button"
                  onClick={handleQuickLaunch}
                  disabled={isLaunchingQuickGame || !quickQuestionText.trim() || !quickCorrectAnswer.trim()}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-emerald-500/25 flex items-center justify-center space-x-2.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLaunchingQuickGame ? (
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current" />
                      <span>🚀 O‘YINNI BOSHLASH VA SAVOL BERISH</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold">Mening o‘yinlarim</span>
                <Trophy className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white">{games.length}</p>
              <p className="text-[11px] text-slate-500 mt-1">Yaratilgan barcha o‘yinlar</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold">Savollar banki</span>
                <BookOpen className="w-5 h-5 text-sky-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white">{bankQuestions.length}</p>
              <p className="text-[11px] text-slate-500 mt-1">Tayyor saralangan savollar</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold">Faol o‘yinlar</span>
                <Play className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white">
                {games.filter((g) => g.status === 'in_progress').length}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Hozir o‘tkazilayotgan</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold">Taymer me’yori</span>
                <Clock className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white">60 soniya</p>
              <p className="text-[11px] text-slate-500 mt-1">Klassik Zakovat standarti</p>
            </div>
          </div>

          {/* Recent Games Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-white">Oxirgi o‘yinlar</h2>
                <p className="text-xs text-slate-400">
                  Turnirlarni tanlang va o‘quvchilar bilan bellashuvni boshlang
                </p>
              </div>
              <button
                onClick={() => setActiveTab('my-games')}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300"
              >
                Barchasini ko‘rish →
              </button>
            </div>

            <div className="divide-y divide-slate-800/80">
              {games.slice(0, 5).map((game) => (
                <div
                  key={game.id}
                  className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-850/50 rounded-xl px-2 transition-colors"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-100 text-sm sm:text-base">
                        {game.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          game.status === 'in_progress'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : game.status === 'finished'
                            ? 'bg-slate-700 text-slate-300'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {game.status === 'in_progress'
                          ? 'O‘yin ketmoqda'
                          : game.status === 'finished'
                          ? 'Yakunlangan'
                          : 'Kutilmoqda'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
                      <span>
                        PIN kod: <strong className="font-mono text-amber-400">{game.code}</strong>
                      </span>
                      <span>•</span>
                      <span>Savollar: {game.questions.length} ta</span>
                      {game.groupName && (
                        <>
                          <span>•</span>
                          <span>Guruh: {game.groupName}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => loadHostGame(game.id)}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 flex items-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Boshqarish</span>
                    </button>
                    <button
                      onClick={() => handleDuplicateGame(game.id)}
                      title="Nusxa olish"
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Mening o‘yinlarim (My Games List) */}
      {activeTab === 'my-games' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Mening o‘yinlarim</h1>
              <p className="text-xs text-slate-400">
                Siz tomonidan yaratilgan barcha turnirlar ro‘yxati
              </p>
            </div>
            <button
              onClick={() => setActiveTab('create-game')}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-amber-500/20 flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Yangi o‘yin qo‘shish</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {games.map((g) => (
              <div
                key={g.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-base text-white line-clamp-1">{g.title}</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        g.status === 'in_progress'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : g.status === 'finished'
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {g.status === 'in_progress'
                        ? 'Faol'
                        : g.status === 'finished'
                        ? 'Tugagan'
                        : 'Tayyor'}
                    </span>
                  </div>

                  {g.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 mb-3">{g.description}</p>
                  )}

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5 text-xs text-slate-300 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">O‘yin PIN kodi:</span>
                      <span className="font-mono font-bold text-amber-400 text-sm tracking-wider">
                        {g.code}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Savollar soni:</span>
                      <span className="font-semibold text-white">{g.questions.length} ta</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Guruh / Sinf:</span>
                      <span className="font-semibold text-white">{g.groupName || 'Umumiy'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => loadHostGame(g.id)}
                    className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-1 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Ochish</span>
                  </button>
                  <button
                    onClick={() => handleDuplicateGame(g.id)}
                    title="Nusxa olish"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteGame(g.id)}
                    title="O‘chirish"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 text-xs transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Yangi o‘yin yaratish (Create Game Wizard) */}
      {activeTab === 'create-game' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Yangi intellektual o‘yin yaratish</h1>
            <p className="text-xs text-slate-400">
              O‘yin parametrlarini sozlang, savollarni qo‘shing yoki savollar bankidan bir zumda tanlab oling.
            </p>
          </div>

          {/* Step 1: Basic Game Details */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
              <Sliders className="w-4 h-4" />
              <span>1. O‘yin asosiy sozlamalari</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  O‘yin nomi *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Masalan: 10-A sinf Zakovat bahori yoki Fan haftaligi musobaqasi"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:border-amber-400 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Sinf yoki Guruh nomi
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Masalan: 9-sinflar o'rtasida"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:border-amber-400 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Har bir savol uchun vaqt (soniya)
                </label>
                <select
                  value={newDefaultTime}
                  onChange={(e) => setNewDefaultTime(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-amber-400 outline-none text-sm"
                >
                  <option value={30}>30 soniya (Tezkor blits)</option>
                  <option value={45}>45 soniya</option>
                  <option value={60}>60 soniya (Klassik standart)</option>
                  <option value={90}>90 soniya</option>
                  <option value={120}>120 soniya (Murakkab savollar)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  O‘yin tavsifi (ixtiyoriy)
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  placeholder="Ishtirokchilar uchun qisqacha yo'riqnoma yoki musobaqa maqsadi..."
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:border-amber-400 outline-none text-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Questions Manager */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
                  <Layers className="w-4 h-4" />
                  <span>2. Savollar to‘plami ({newQuestions.length} ta savol)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  O‘zingiz yangi savol yozing yoki pastdagi savollar bankidan tanlang
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isGeneratingAiQuestion}
                  onClick={() => handleGenerateAIQuestion()}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-purple-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  <span>{isGeneratingAiQuestion ? 'AI savol tuzmoqda...' : '✨ AI orqali savol yaratish'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddQuestionFromScratch}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Yangi savol yozish</span>
                </button>
              </div>
            </div>

            {/* Questions List */}
            {newQuestions.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-800 rounded-2xl p-6">
                <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-400">
                  Hozircha savollar qo‘shilmagan
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Pastdagi "Savollar bankidan tanlash" ro‘yxatidagi savollarga bosing yoki "Yangi savol yozish" tugmasidan foydalaning.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {newQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 relative space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                        Savol #{idx + 1}
                      </span>
                      <button
                        onClick={() => setNewQuestions(newQuestions.filter((item) => item.id !== q.id))}
                        className="text-xs text-rose-400 hover:text-rose-300 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={q.text}
                        onChange={(e) => {
                          const updated = [...newQuestions];
                          updated[idx].text = e.target.value;
                          setNewQuestions(updated);
                        }}
                        placeholder="Savol matnini kiriting..."
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:border-amber-400 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          To‘g‘ri javob *
                        </label>
                        <input
                          type="text"
                          value={q.correctAnswer}
                          onChange={(e) => {
                            const updated = [...newQuestions];
                            updated[idx].correctAnswer = e.target.value;
                            setNewQuestions(updated);
                          }}
                          placeholder="To'g'ri javob"
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-emerald-300 font-semibold text-xs focus:border-emerald-400 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Izoh / Tushuntirish (ixtiyoriy)
                        </label>
                        <input
                          type="text"
                          value={q.explanation || ''}
                          onChange={(e) => {
                            const updated = [...newQuestions];
                            updated[idx].explanation = e.target.value;
                            setNewQuestions(updated);
                          }}
                          placeholder="Javob izohi"
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-300 text-xs focus:border-amber-400 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Question Bank Quick Picker */}
            <div className="pt-4 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Savollar bankidan tezkor qo‘shish:
              </h4>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {bankQuestions.map((bq) => {
                  const isAdded = newQuestions.some((q) => q.text === bq.text);
                  return (
                    <div
                      key={bq.id}
                      onClick={() => !isAdded && handleImportBankQuestion(bq)}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        isAdded
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 cursor-default'
                          : 'bg-slate-950 border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 text-slate-300'
                      }`}
                    >
                      <div className="line-clamp-1 flex-1">
                        <strong className="text-amber-400 mr-2">[{bq.category}]</strong>
                        {bq.text}
                      </div>
                      <span className="shrink-0 font-semibold">
                        {isAdded ? (
                          <span className="flex items-center space-x-1 text-emerald-400">
                            <Check className="w-3.5 h-3.5" />
                            <span>Qo‘shilgan</span>
                          </span>
                        ) : (
                          <span className="text-amber-400 hover:underline">+ Tanlash</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Submit game */}
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={() => setActiveTab('my-games')}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleSaveNewGame}
              disabled={isCreatingGame}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center space-x-2 transition-all cursor-pointer"
            >
              {isCreatingGame ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>O‘yinni saqlash va boshqaruv zalini ochish</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: Savollar banki (Questions Bank) */}
      {activeTab === 'question-bank' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Savollar banki</h1>
              <p className="text-xs text-slate-400">
                O‘yinlar uchun sifatli va tahliliy Zakovat savollari xazinasi
              </p>
            </div>
            <button
              onClick={() => setShowAddBankModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-amber-500/20 flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Yangi savol kiritish</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                placeholder="Savol yoki javob bo‘yicha qidirish..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-500 text-xs sm:text-sm focus:border-amber-400 outline-none"
              />
            </div>

            <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setBankCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    bankCategory === cat
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {cat === 'all' ? 'Barchasi' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Bank Questions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bankQuestions
              .filter((bq) => {
                if (bankCategory !== 'all' && bq.category.toLowerCase() !== bankCategory.toLowerCase()) {
                  return false;
                }
                if (bankSearch.trim()) {
                  const s = bankSearch.toLowerCase();
                  return bq.text.toLowerCase().includes(s) || bq.correctAnswer.toLowerCase().includes(s);
                }
                return true;
              })
              .map((bq) => (
                <div
                  key={bq.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {bq.category}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Standart: {bq.suggestedTimeSec} soniya
                      </span>
                    </div>

                    <p className="text-sm font-medium text-slate-200 leading-relaxed mb-4">
                      {bq.text}
                    </p>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
                    <p className="text-xs text-emerald-400 font-bold">
                      Javob: <span className="text-white font-normal">{bq.correctAnswer}</span>
                    </p>
                    {bq.explanation && (
                      <p className="text-[11px] text-slate-400">
                        <strong className="text-amber-400">Izoh:</strong> {bq.explanation}
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>

          {/* Add Bank Question Modal */}
          {showAddBankModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-white text-base">Savollar bankiga yangi savol</h3>
                  <button
                    onClick={() => setShowAddBankModal(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                      Kategoriya
                    </label>
                    <select
                      value={newBankCategory}
                      onChange={(e) => setNewBankCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs outline-none"
                    >
                      {categories
                        .filter((c) => c !== 'all')
                        .map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-300 uppercase">
                        Savol matni *
                      </label>
                      <button
                        type="button"
                        disabled={isGeneratingAiQuestion}
                        onClick={handleGenerateAIQuestionForBank}
                        className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isGeneratingAiQuestion ? 'AI tuzmoqda...' : '✨ AI orqali to‘ldirish'}</span>
                      </button>
                    </div>
                    <textarea
                      value={newBankText}
                      onChange={(e) => setNewBankText(e.target.value)}
                      rows={3}
                      placeholder="Zakovat savoli matni..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                      To‘g‘ri javob *
                    </label>
                    <input
                      type="text"
                      value={newBankAnswer}
                      onChange={(e) => setNewBankAnswer(e.target.value)}
                      placeholder="Aniq to'g'ri javob"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-emerald-300 font-semibold text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                      Izoh / Manba
                    </label>
                    <textarea
                      value={newBankExplanation}
                      onChange={(e) => setNewBankExplanation(e.target.value)}
                      rows={2}
                      placeholder="Tarixiy dalil yoki mantiqiy tushuntirish..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-300 text-xs outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => setShowAddBankModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Bekor qilish
                  </button>
                  <button
                    onClick={handleSaveBankQuestion}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                  >
                    Saqlash
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Jonli O‘yin Boshqaruvi (Host Live Game Controller) */}
      {activeTab === 'live-host' && hostGame && (
        <div className="space-y-6">
          {/* Top Host Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <h1 className="text-xl sm:text-2xl font-black text-white">{hostGame.title}</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                  {hostGame.groupName || 'Zakovat'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Jami savollar: {hostGame.questions.length} ta • Ishtirokchilar:{' '}
                {hostParticipants.length} nafar
              </p>
            </div>

            {/* Room Code Display with Copy */}
            <div className="flex items-center space-x-3 bg-slate-950 border border-amber-500/40 rounded-2xl p-2 px-4 shadow-inner">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">
                  O‘quvchilar uchun PIN kod:
                </span>
                <span className="font-mono text-2xl font-black tracking-widest text-amber-400">
                  {hostGame.code}
                </span>
              </div>
              <button
                onClick={handleCopyCode}
                title="Kodni nusxalash"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                {copyCodeSuccess ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* WAITING LOBBY MODE */}
          {hostGame.status === 'waiting' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 text-center shadow-2xl">
              <div className="max-w-md mx-auto space-y-6">
                <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                  <Users className="w-10 h-10" />
                </div>

                <div>
                  <h2 className="text-2xl font-black text-white">Ishtirokchilarni kutish zali</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    O‘quvchilarga <span className="font-mono text-amber-400 font-bold">{hostGame.code}</span> PIN
                    kodini e’lon qiling. Ular tizimga kirishi bilan ro‘yxatda ko‘rinadi.
                  </p>
                </div>

                {/* Joined participants preview pills */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 min-h-[120px]">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Qo‘shilgan ishtirokchilar ({hostParticipants.length} nafar):
                  </p>
                  {hostParticipants.length === 0 ? (
                    <p className="text-xs text-slate-600 py-6">
                      Hozircha hech kim qo‘shilmadi. PIN kodni o‘quvchilarga bering.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2 justify-center max-h-48 overflow-y-auto">
                      {hostParticipants.map((p) => (
                        <span
                          key={p.id}
                          className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-semibold text-slate-200 flex items-center space-x-1.5"
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          <span>{p.name}</span>
                          <button
                            onClick={() => handleKickParticipant(p.id)}
                            title="Chetlashtirish"
                            className="text-slate-500 hover:text-rose-400 ml-1 text-xs"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleStartGame}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base shadow-xl shadow-emerald-500/25 flex items-center justify-center space-x-2 transition-all hover:scale-101 active:scale-98 cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>O‘yinni boshlash (1-savol)</span>
                </button>
              </div>
            </div>
          )}

          {/* ACTIVE QUESTION CONTROLLER (in_progress or evaluating) */}
          {(hostGame.status === 'in_progress' || hostGame.status === 'evaluating') && (
            <div className="space-y-6">
              {/* Controller Bar */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
                  {/* Current Question Info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xs uppercase font-extrabold tracking-widest px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Savol {hostGame.currentQuestionIndex + 1} / {hostGame.questions.length}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        Kategoriya:{' '}
                        {hostGame.questions[hostGame.currentQuestionIndex]?.category || 'Umumiy'}
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
                      {hostGame.questions[hostGame.currentQuestionIndex]?.text}
                    </h2>

                    <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
                      <span className="text-emerald-400 font-bold">To‘g‘ri javob: </span>
                      <span className="text-white font-semibold">
                        {hostGame.questions[hostGame.currentQuestionIndex]?.correctAnswer}
                      </span>
                      {hostGame.questions[hostGame.currentQuestionIndex]?.explanation && (
                        <p className="text-slate-400 mt-1">
                          <strong className="text-amber-400">Izoh: </strong>
                          {hostGame.questions[hostGame.currentQuestionIndex]?.explanation}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Synchronized Big Timer */}
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-28 h-28 rounded-3xl bg-slate-950 border-2 flex flex-col items-center justify-center shadow-2xl transition-all ${
                        hostTimeLeft <= 10
                          ? 'border-rose-500 text-rose-400 shadow-rose-500/20'
                          : hostTimeLeft <= 25
                          ? 'border-amber-500 text-amber-400 shadow-amber-500/20'
                          : 'border-emerald-500 text-emerald-400 shadow-emerald-500/20'
                      }`}
                    >
                      <span className="text-4xl font-black font-mono tracking-tighter">
                        {hostTimeLeft}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                        Soniya
                      </span>
                    </div>

                    {/* Timer control buttons */}
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={handlePauseResume}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                      >
                        {hostGame.isTimerPaused ? (
                          <>
                            <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                            <span>Davom ettirish</span>
                          </>
                        ) : (
                          <>
                            <Pause className="w-3.5 h-3.5 text-amber-400 fill-current" />
                            <span>Vaqtni to‘xtatish</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleEndTimerEarly}
                        disabled={hostGame.status === 'evaluating'}
                        className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Vaqtni yakunlash</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* AI Voice Announcer Bar for Host */}
                <div className="mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isHostAiSpeaking
                          ? 'bg-amber-400 text-slate-950 animate-bounce'
                          : 'bg-slate-800 text-amber-400'
                      }`}
                    >
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-amber-300">
                        AI Boshlovchi Ovozli E’loni: {isHostAiSpeaking ? 'Savol o‘qilmoqda...' : 'Tayyor'}
                      </span>
                      <p className="text-[11px] text-slate-400">
                        O‘quvchilar va karnaylar orqali savolni jarangdor ovozda eshittiring
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Voice style selector */}
                    <select
                      value={hostVoice}
                      onChange={(e) => {
                        const v = e.target.value;
                        setHostVoice(v);
                        aiVoice.setVoice(v);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 text-[11px] font-semibold outline-none cursor-pointer"
                    >
                      <option value="Puck">👦 Jasur (Haqiqiy o‘g‘il bola ovozi - Jonli)</option>
                      <option value="Zephyr">🎙️ Sardor (Haqiqiy yosh yigit ovozi - Ravon)</option>
                      <option value="Charon">🧔 Bobur (Haqiqiy rasmiy erkak ovozi)</option>
                    </select>

                    {isHostAiSpeaking ? (
                      <button
                        type="button"
                        onClick={() => aiVoice.stopSpeaking()}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center space-x-1 cursor-pointer"
                      >
                        <VolumeX className="w-3.5 h-3.5" />
                        <span>Ovozni to‘xtatish</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const currentQ = hostGame.questions[hostGame.currentQuestionIndex];
                          if (currentQ) {
                            aiVoice.speakQuestion(
                              currentQ.text,
                              hostGame.currentQuestionIndex + 1,
                              { force: true, voice: hostVoice }
                            );
                          }
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center space-x-1.5 shadow-sm cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Savolni AI ovozida o‘qish</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setAutoHostAiSpeak(aiVoice.toggleAutoSpeak())}
                      className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold cursor-pointer ${
                        autoHostAiSpeak
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      Avto-ovoz: {autoHostAiSpeak ? 'Yoqilgan' : 'O‘chirilgan'}
                    </button>
                  </div>
                </div>

                {/* Progress actions: Next Question or Finish */}
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-400">
                    Javob berganlar:{' '}
                    <strong className="text-amber-400">
                      {
                        hostAnswers.filter(
                          (a) =>
                            a.questionId ===
                            hostGame.questions[hostGame.currentQuestionIndex]?.id
                        ).length
                      }{' '}
                      / {hostParticipants.length} nafar
                    </strong>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleBulkAutoReview}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <CheckCheck className="w-4 h-4 text-emerald-400" />
                      <span>Barchasini avtomatik tekshirish</span>
                    </button>

                    {hostGame.currentQuestionIndex + 1 < hostGame.questions.length ? (
                      <button
                        onClick={handleNextQuestion}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 flex items-center space-x-2 transition-all cursor-pointer"
                      >
                        <span>Keyingi savol</span>
                        <SkipForward className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={handleFinishGame}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/20 flex items-center space-x-2 transition-all cursor-pointer"
                      >
                        <Trophy className="w-4 h-4" />
                        <span>O‘yinni yakunlash</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Answers Review Table (Live responses) */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span>Ushbu savol bo‘yicha o‘quvchilar javoblari va baholash</span>
                  </h3>
                  <span className="text-xs text-slate-500">
                    O‘qituvchi istalgan javobni qayta ko‘rib chiqishi mumkin
                  </span>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-slate-900 text-xs uppercase text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-3 px-4">Ishtirokchi</th>
                          <th className="py-3 px-4">Yozilgan javob</th>
                          <th className="py-3 px-4 text-center">Vaqt</th>
                          <th className="py-3 px-4 text-center">Holat</th>
                          <th className="py-3 px-4 text-right">O‘qituvchi bahosi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {hostParticipants.map((p) => {
                          const currentQ = hostGame.questions[hostGame.currentQuestionIndex];
                          const answer = hostAnswers.find(
                            (a) => a.participantId === p.id && a.questionId === currentQ?.id
                          );

                          return (
                            <tr key={p.id} className="hover:bg-slate-900/40">
                              <td className="py-3 px-4">
                                <span className="font-semibold text-slate-200">{p.name}</span>
                                {p.studentIdOrGroup && (
                                  <span className="block text-[11px] text-slate-500">
                                    {p.studentIdOrGroup}
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-4">
                                {answer ? (
                                  <span className="font-mono text-slate-100 font-semibold bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                                    "{answer.answerText}"
                                  </span>
                                ) : (
                                  <span className="text-slate-600 italic">Javob berilmadi</span>
                                )}
                              </td>

                              <td className="py-3 px-4 text-center text-slate-400 text-xs">
                                {answer ? `${answer.timeTakenSec} soniya` : '-'}
                              </td>

                              <td className="py-3 px-4 text-center">
                                {answer ? (
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      answer.status === 'correct'
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : answer.status === 'wrong'
                                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    }`}
                                  >
                                    {answer.status === 'correct'
                                      ? 'To‘g‘ri'
                                      : answer.status === 'wrong'
                                      ? 'Noto‘g‘ri'
                                      : 'Kutilmoqda'}
                                  </span>
                                ) : (
                                  <span className="text-slate-600">-</span>
                                )}
                              </td>

                              <td className="py-3 px-4 text-right">
                                {answer ? (
                                  <div className="inline-flex items-center space-x-1.5">
                                    <button
                                      onClick={() =>
                                        handleReviewAnswer(
                                          answer.id,
                                          'correct',
                                          currentQ?.points || 1
                                        )
                                      }
                                      title="To'g'ri deb baholash (+ball)"
                                      className={`p-1.5 rounded-lg border transition-all ${
                                        answer.status === 'correct'
                                          ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                                          : 'bg-slate-900 hover:bg-emerald-500/20 text-emerald-400 border-slate-700'
                                      }`}
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>

                                    <button
                                      onClick={() => handleReviewAnswer(answer.id, 'wrong', 0)}
                                      title="Noto'g'ri deb baholash (0 ball)"
                                      className={`p-1.5 rounded-lg border transition-all ${
                                        answer.status === 'wrong'
                                          ? 'bg-rose-500 text-white font-bold border-rose-400'
                                          : 'bg-slate-900 hover:bg-rose-500/20 text-rose-400 border-slate-700'
                                      }`}
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-slate-600 text-xs">0 ball</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FINISHED MODE (FINAL RESULTS & LEADERBOARD) */}
          {hostGame.status === 'finished' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
                <div>
                  <div className="inline-flex items-center space-x-2 text-xs uppercase font-extrabold text-amber-400 mb-1">
                    <Trophy className="w-4 h-4" />
                    <span>Yakuniy natijalar</span>
                  </div>
                  <h2 className="text-2xl font-black text-white">{hostGame.title}</h2>
                  <p className="text-xs text-slate-400">
                    Barcha savollar yakunlandi. Natijalarni e’lon qilishingiz mumkin.
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={handlePublishResults}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 flex items-center space-x-2 transition-all cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Natijalarni o‘quvchilarga e’lon qilish</span>
                  </button>
                </div>
              </div>

              {/* Leaderboard Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900 text-xs uppercase text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-3.5 px-4">O‘rin</th>
                        <th className="py-3.5 px-4">Ishtirokchi</th>
                        <th className="py-3.5 px-4 text-center">To‘g‘ri javoblar</th>
                        <th className="py-3.5 px-4 text-center">Xato javoblar</th>
                        <th className="py-3.5 px-4 text-center">Sarflangan vaqt</th>
                        <th className="py-3.5 px-4 text-right">Umumiy ball</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {hostLeaderboard.map((entry) => (
                        <tr key={entry.participantId} className="hover:bg-slate-900/40">
                          <td className="py-3.5 px-4">
                            {entry.rank === 1 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-yellow-400 text-slate-950 font-black text-xs">
                                1
                              </span>
                            ) : entry.rank === 2 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-slate-950 font-black text-xs">
                                2
                              </span>
                            ) : entry.rank === 3 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700 text-white font-black text-xs">
                                3
                              </span>
                            ) : (
                              <span className="font-mono text-slate-400 text-xs">#{entry.rank}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-100">{entry.name}</span>
                            {entry.groupName && (
                              <span className="block text-xs text-slate-500 font-normal">
                                {entry.groupName}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center text-emerald-400 font-bold">
                            {entry.correctCount}
                          </td>
                          <td className="py-3.5 px-4 text-center text-rose-400">
                            {entry.wrongCount}
                          </td>
                          <td className="py-3.5 px-4 text-center text-slate-400 text-xs font-mono">
                            {entry.totalAnswerTimeSec} soniya
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-amber-400 text-base">
                            {entry.score} ball
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
