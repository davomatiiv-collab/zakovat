import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Users,
  Award,
  Sparkles,
  ArrowRight,
  RotateCcw,
  HelpCircle,
  Lock,
  Medal,
  Volume2,
  VolumeX,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Game, Question, Participant, Answer, LeaderboardEntry } from '../types/index.ts';
import { api, realtime } from '../services/api.ts';
import { sounds } from '../utils/audio.ts';
import { aiVoice } from '../utils/aiVoice.ts';

interface StudentGameViewProps {
  initialCode?: string;
  onExit?: () => void;
}

export const StudentGameView: React.FC<StudentGameViewProps> = ({ initialCode = '', onExit }) => {
  // Join step state
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [isSubmittingJoin, setIsSubmittingJoin] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Live game state
  const [game, setGame] = useState<Game | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Answer state
  const [answerText, setAnswerText] = useState('');
  const [isAnswerSent, setIsAnswerSent] = useState(false);
  const [lastSubmittedAnswer, setLastSubmittedAnswer] = useState<Answer | null>(null);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null);

  // Synchronized countdown timer
  const [timeLeftSec, setTimeLeftSec] = useState<number>(60);
  const [totalTimeLimit, setTotalTimeLimit] = useState<number>(60);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const timerRef = useRef<any>(null);
  const lastTickedSecondRef = useRef<number>(-1);

  // AI Voice State
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [autoAiSpeak, setAutoAiSpeak] = useState(aiVoice.isAutoSpeakEnabled());
  const [selectedVoice, setSelectedVoice] = useState(aiVoice.getVoice());
  const [showWinnerCelebration, setShowWinnerCelebration] = useState(false);
  const hasCelebratedWinRef = useRef(false);

  const triggerVictoryCelebration = () => {
    sounds.playVictoryFanfare();
    const count = 200;
    const defaults = { origin: { y: 0.6 } };
    const fire = (particleRatio: number, opts: confetti.Options) => {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    };
    fire(0.25, { spread: 30, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.9 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  };

  const checkAndCelebrateWin = (lb: LeaderboardEntry[]) => {
    if (!participant || hasCelebratedWinRef.current) return;
    const myEntry = lb.find((l) => l.participantId === participant.id);
    if (myEntry && myEntry.rank === 1) {
      hasCelebratedWinRef.current = true;
      setShowWinnerCelebration(true);
      triggerVictoryCelebration();
      aiVoice.speakAnnouncement(
        `Tabriklaymiz! Siz birinchi o‘rinni egallab, Zakovat intellektual o‘yinida g‘olib bo‘ldingiz! Balingiz: ${myEntry.score} ball! G‘alabangiz muborak bo‘lsin!`
      );
    } else if (lb.length > 0) {
      const topWinner = lb[0];
      aiVoice.speakAnnouncement(
        `O‘yin yakunlandi! 1-o‘rin g‘olibi: ${topWinner.name}, to‘plagan bali: ${topWinner.score} ball! Barcha ishtirokchilarga tashakkur!`
      );
    }
  };

  useEffect(() => {
    const unsub = aiVoice.subscribe((speaking) => {
      setIsAiSpeaking(speaking);
    });
    return () => {
      unsub();
      aiVoice.stopSpeaking();
    };
  }, []);

  // Try to restore saved participant session
  useEffect(() => {
    const saved = localStorage.getItem('zakovat_participant_session');
    if (saved && !isJoined) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.gameCode && parsed.participant) {
          setCode(parsed.gameCode);
          setName(parsed.participant.name);
          setGroupName(parsed.participant.studentIdOrGroup || '');
          handleJoin(parsed.gameCode, parsed.participant.name, parsed.participant.studentIdOrGroup);
        }
      } catch {}
    }
  }, []);

  // Real-time WebSocket subscriptions
  useEffect(() => {
    if (!isJoined || !game) return;

    // Join WS room
    realtime.joinRoom({
      gameCode: game.code,
      gameId: game.id,
      role: 'student',
      participantId: participant?.id,
      name: participant?.name,
    });

    const unsubGameState = realtime.on('game_state', (payload) => {
      if (payload.game) {
        setGame(payload.game);
        if (payload.leaderboard) setLeaderboard(payload.leaderboard);
        if (payload.participants) setParticipants(payload.participants);

        // Update current question
        if (payload.game.questions && payload.game.questions.length > 0) {
          const q = payload.game.questions[payload.game.currentQuestionIndex];
          if (q) {
            setCurrentQuestion(q);
            setTotalTimeLimit(q.timeLimitSec || 60);
          }
        }
      }
    });

    const unsubGameStarted = realtime.on('game_started', (payload) => {
      setGame(payload.game);
      if (payload.currentQuestion) {
        setCurrentQuestion(payload.currentQuestion);
        setTotalTimeLimit(payload.currentQuestion.timeLimitSec || 60);
        setIsTimeUp(false);
        setAnswerText('');
        setIsAnswerSent(false);
        setLastSubmittedAnswer(null);
        setSubmissionFeedback(null);
        sounds.playGong();

        // AI Voice speaks out the first question!
        aiVoice.speakQuestion(payload.currentQuestion.text, 1);
      }
    });

    const unsubQuestionChanged = realtime.on('question_changed', (payload) => {
      setGame(payload.game);
      if (payload.question) {
        setCurrentQuestion(payload.question);
        setTotalTimeLimit(payload.question.timeLimitSec || 60);
        setIsTimeUp(false);
        setAnswerText('');
        setIsAnswerSent(false);
        setLastSubmittedAnswer(null);
        setSubmissionFeedback(null);
        sounds.playGong();

        // AI Voice speaks out the new question!
        const orderNum = payload.question.order || (payload.questionIndex !== undefined ? payload.questionIndex + 1 : 1);
        aiVoice.speakQuestion(payload.question.text, orderNum);
      }
      if (payload.leaderboard) setLeaderboard(payload.leaderboard);
    });

    const unsubTimeUp = realtime.on('time_up', (payload) => {
      setIsTimeUp(true);
      setTimeLeftSec(0);
      sounds.playTimeUp();
      aiVoice.stopSpeaking();
      if (payload.currentQuestion) {
        setCurrentQuestion((prev) => ({
          ...prev,
          ...payload.currentQuestion,
        }));
      }
    });

    const unsubAnswerEval = realtime.on('answer_evaluated', (payload) => {
      if (payload.answer && participant && payload.answer.participantId === participant.id) {
        setLastSubmittedAnswer(payload.answer);
        if (payload.answer.status === 'correct') {
          sounds.playCorrect();
        }
      }
      if (payload.leaderboard) setLeaderboard(payload.leaderboard);
    });

    const unsubGameFinished = realtime.on('game_finished', (payload) => {
      setGame(payload.game);
      if (payload.leaderboard) {
        setLeaderboard(payload.leaderboard);
        checkAndCelebrateWin(payload.leaderboard);
      }
    });

    const unsubResultsPublished = realtime.on('results_published', (payload) => {
      if (payload.game) setGame(payload.game);
      if (payload.leaderboard) {
        setLeaderboard(payload.leaderboard);
        checkAndCelebrateWin(payload.leaderboard);
      }
    });

    const unsubParticipantKicked = realtime.on('participant_kicked', (payload) => {
      if (payload.participantId === participant?.id) {
        alert("O'qituvchi sizni o'yindan chetlashtirdi.");
        localStorage.removeItem('zakovat_participant_session');
        setIsJoined(false);
        setGame(null);
        setParticipant(null);
      }
    });

    return () => {
      unsubGameState();
      unsubGameStarted();
      unsubQuestionChanged();
      unsubTimeUp();
      unsubAnswerEval();
      unsubGameFinished();
      unsubResultsPublished();
      unsubParticipantKicked();
    };
  }, [isJoined, game?.id, participant?.id]);

  // Synchronized server timer calculation loop
  useEffect(() => {
    if (!game || game.status !== 'in_progress' || !game.questionDeadline) {
      if (game?.status === 'evaluating' || game?.status === 'finished') {
        setIsTimeUp(true);
        setTimeLeftSec(0);
      }
      return;
    }

    const interval = setInterval(() => {
      if (game.isTimerPaused) {
        const remaining = Math.max(0, Math.ceil((game.timerRemainingMs || 0) / 1000));
        setTimeLeftSec(remaining);
        return;
      }

      const now = Date.now();
      const diffMs = game.questionDeadline! - now;
      const remaining = Math.max(0, Math.ceil(diffMs / 1000));

      setTimeLeftSec(remaining);

      // Play tick sound for last 10 seconds
      if (remaining <= 10 && remaining > 0 && remaining !== lastTickedSecondRef.current) {
        lastTickedSecondRef.current = remaining;
        sounds.playTick();
      }

      if (diffMs <= 0 && !isTimeUp) {
        setIsTimeUp(true);
        sounds.playTimeUp();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [game?.status, game?.questionDeadline, game?.isTimerPaused, isTimeUp]);

  // Join game action
  const handleJoin = async (targetCode = code, targetName = name, targetGroup = groupName) => {
    if (!targetCode || !targetName) {
      setJoinError('Iltimos, o‘yin kodi va ismingizni kiriting');
      return;
    }
    setJoinError('');
    setIsSubmittingJoin(true);

    try {
      const res = await api.joinGame(targetCode.trim(), targetName.trim(), targetGroup.trim());
      setParticipant(res.participant);
      setGame(res.game);
      setIsJoined(true);

      if (res.game.questions && res.game.questions.length > 0) {
        const q = res.game.questions[res.game.currentQuestionIndex];
        if (q) {
          setCurrentQuestion(q);
          setTotalTimeLimit(q.timeLimitSec || 60);
        }
      }

      // Save session
      localStorage.setItem(
        'zakovat_participant_session',
        JSON.stringify({
          gameCode: targetCode,
          participant: res.participant,
        })
      );
    } catch (err: any) {
      setJoinError(err.message || "O'yinga qo'shilishda xatolik");
    } finally {
      setIsSubmittingJoin(false);
    }
  };

  // Submit answer action
  const handleSubmitAnswer = async () => {
    if (!answerText.trim() || !game || !currentQuestion || !participant) return;
    if (isTimeUp) {
      setSubmissionFeedback('Vaqt tugadi! Javob server tomonidan qabul qilinmadi.');
      return;
    }

    setIsSubmittingAnswer(true);
    setSubmissionFeedback(null);

    try {
      const res = await api.submitAnswer({
        gameId: game.id,
        questionId: currentQuestion.id,
        participantId: participant.id,
        answerText: answerText.trim(),
      });

      if (res.success) {
        setIsAnswerSent(true);
        setLastSubmittedAnswer(res.answer);
        sounds.playSubmit();
        setSubmissionFeedback('Javobingiz qabul qilindi!');
      }
    } catch (err: any) {
      setSubmissionFeedback(err.message || 'Javob yuborishda xatolik yuz berdi');
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  // Exit from game session
  const handleLeaveGame = () => {
    localStorage.removeItem('zakovat_participant_session');
    setIsJoined(false);
    setGame(null);
    setParticipant(null);
    if (onExit) onExit();
  };

  // 1. Join Form Screen
  if (!isJoined) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          {/* Top golden glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-3 bg-gradient-to-r from-transparent via-amber-400 to-transparent blur-sm"></div>

          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 mx-auto mb-4 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Brain className="w-9 h-9 text-amber-400" />
              </div>
            </div>
            <h2 className="text-2xl font-black font-['Cinzel',serif] text-amber-400 tracking-wide">
              ZAKOVAT MAYDONI
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              O‘qituvchi bergan kodni kiritib, bellashuvga qo‘shiling
            </p>
          </div>

          {joinError && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{joinError}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                O‘yin kodi (PIN) *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\s+/g, ''))}
                placeholder="Masalan: 749201"
                maxLength={8}
                className="w-full text-center text-2xl font-mono font-bold tracking-widest px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-amber-300 placeholder:text-slate-600 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Ism va familiyangiz *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masalan: Azizbek Rahimov"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-slate-100 placeholder:text-slate-600 outline-none transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Sinf yoki Jamoa nomi (ixtiyoriy)
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Masalan: 9-A sinf yoki 'Qaqnus' jamoasi"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-slate-100 placeholder:text-slate-600 outline-none transition-all text-sm"
              />
            </div>

            <button
              onClick={() => handleJoin()}
              disabled={isSubmittingJoin}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-base shadow-lg shadow-amber-500/25 flex items-center justify-center space-x-2 transition-all hover:scale-101 active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {isSubmittingJoin ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>O‘yinga kirish</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-500">
              Namunaviy o‘yin kodi: <span className="font-mono text-amber-400 font-bold">749201</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Waiting Lobby Screen (Before teacher starts)
  if (game?.status === 'waiting') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold mb-6 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kutish zali • Jonli ulanish faol</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 mb-2">
            {game.title}
          </h1>
          {game.description && (
            <p className="text-sm text-slate-400 max-w-xl mx-auto mb-4">{game.description}</p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400 mb-8">
            <span className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-300">
              O‘qituvchi: <strong className="text-amber-400">{game.teacherName}</strong>
            </span>
            {game.groupName && (
              <span className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-300">
                Guruh: <strong className="text-white">{game.groupName}</strong>
              </span>
            )}
            <span className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-300">
              Savollar soni: <strong className="text-white">{game.questions.length} ta</strong>
            </span>
          </div>

          {/* Player identity badge */}
          <div className="max-w-md mx-auto bg-slate-950 border border-amber-500/30 rounded-2xl p-5 mb-8 shadow-inner">
            <p className="text-xs text-slate-400 mb-1">Siz quyidagi nom bilan qo‘shildingiz:</p>
            <p className="text-lg font-bold text-amber-300">{participant?.name}</p>
            {participant?.studentIdOrGroup && (
              <p className="text-xs text-slate-400 mt-0.5">{participant.studentIdOrGroup}</p>
            )}
          </div>

          {/* Pulse waiting indicator */}
          <div className="flex flex-col items-center justify-center my-6 space-y-3">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 animate-ping absolute inset-0"></div>
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center relative shadow-lg shadow-amber-500/30">
                <Clock className="w-8 h-8 text-slate-950 animate-spin-slow" />
              </div>
            </div>
            <p className="text-sm font-semibold text-slate-300">
              O‘qituvchi o‘yinni boshlashini kuting...
            </p>
            <p className="text-xs text-slate-500">
              O‘yin boshlanganda 1-savol avtomatik ravishda ekraningizda ochiladi.
            </p>
          </div>

          <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              PIN kod: <strong className="font-mono text-amber-400">{game.code}</strong>
            </span>
            <button
              onClick={handleLeaveGame}
              className="text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors"
            >
              Chiqish
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Finished Game & Leaderboard Screen
  if (game?.status === 'finished' || game?.resultsPublished) {
    const myRank = leaderboard.find((l) => l.participantId === participant?.id);

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
              <Trophy className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black font-['Cinzel',serif] text-amber-400 tracking-wide">
              O‘YIN YAKUNLANDI!
            </h1>
            <p className="text-slate-400 text-sm mt-1">{game.title}</p>
          </div>

          {/* Personal result banner / Winner Celebration */}
          {myRank && myRank.rank === 1 ? (
            <div className="bg-gradient-to-br from-amber-500/25 via-yellow-500/15 to-slate-950 border-2 border-amber-400/80 rounded-3xl p-6 sm:p-10 mb-8 text-center relative overflow-hidden shadow-2xl shadow-amber-500/20">
              {/* Golden sunburst ray effect */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-400/20 via-transparent to-transparent pointer-events-none"></div>

              <div className="relative z-10 flex flex-col items-center">
                {/* Floating Trophy with sparkles */}
                <div className="relative mb-4">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-2xl shadow-amber-400/50 animate-bounce">
                    <Trophy className="w-14 h-14 sm:w-16 sm:h-16 text-slate-950 fill-current" />
                  </div>
                  <Sparkles className="w-8 h-8 text-yellow-300 absolute -top-2 -right-2 animate-pulse" />
                  <Sparkles className="w-6 h-6 text-amber-200 absolute -bottom-1 -left-2 animate-pulse" />
                </div>

                <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs sm:text-sm font-extrabold uppercase tracking-wider mb-2">
                  <Medal className="w-4 h-4 text-amber-300" />
                  <span>1-O‘rin — Mutlaq G‘olib!</span>
                </div>

                <h2 className="text-2xl sm:text-4xl font-black font-['Cinzel',serif] text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-100 tracking-wide mb-2">
                  TABRIKLAYMIZ! SIZ G‘OLIB BO‘LDINGIZ!
                </h2>

                <p className="text-slate-300 text-sm sm:text-base max-w-lg mx-auto mb-6">
                  Zakovat intellektual jangida eng yuksak bilim va chaqqonlikni namoyish etib, faxrli 1-o‘rinni egalladingiz!
                </p>

                {/* Score breakdown pills */}
                <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-md w-full mb-6">
                  <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-amber-500/40 shadow-inner">
                    <p className="text-[11px] sm:text-xs text-amber-300/80 uppercase font-semibold">Umumiy ball</p>
                    <p className="text-xl sm:text-3xl font-black text-amber-300 mt-1">{myRank.score}</p>
                  </div>
                  <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/40 shadow-inner">
                    <p className="text-[11px] sm:text-xs text-emerald-300/80 uppercase font-semibold">To‘g‘ri javob</p>
                    <p className="text-xl sm:text-3xl font-black text-emerald-400 mt-1">{myRank.correctCount}</p>
                  </div>
                  <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-700 shadow-inner">
                    <p className="text-[11px] sm:text-xs text-slate-400 uppercase font-semibold">Xato javob</p>
                    <p className="text-xl sm:text-3xl font-black text-slate-300 mt-1">{myRank.wrongCount}</p>
                  </div>
                </div>

                {/* Interactive celebration buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={triggerVictoryCelebration}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/30 flex items-center space-x-2 transition-all cursor-pointer active:scale-95"
                  >
                    <Sparkles className="w-4 h-4 fill-current" />
                    <span>Konfetti otish 🎊</span>
                  </button>

                  <button
                    onClick={() =>
                      aiVoice.speakAnnouncement(
                        `Tabriklaymiz! Siz 1-o‘rinni egallab, Zakovat intellektual o‘yinida g‘olib bo‘ldingiz! Balingiz: ${myRank.score} ball! G‘alabangiz muborak bo‘lsin!`,
                        { force: true }
                      )
                    }
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-xs sm:text-sm font-bold flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>AI Ovozli Tabrigi</span>
                  </button>
                </div>
              </div>
            </div>
          ) : myRank ? (
            <div className="bg-gradient-to-br from-amber-500/15 via-slate-950 to-slate-950 border border-amber-500/40 rounded-2xl p-6 mb-8 text-center relative overflow-hidden">
              <div className="absolute top-2 right-4 text-xs font-bold text-amber-400/50 uppercase tracking-widest">
                Shaxsiy natijangiz
              </div>
              <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">
                Sizning o‘rningiz
              </p>
              <div className="flex items-center justify-center space-x-2 my-2">
                <span className="text-5xl font-black text-amber-300">#{myRank.rank}</span>
                <span className="text-sm text-slate-400 font-medium">/ {leaderboard.length} nafar</span>
              </div>
              <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto mt-4 text-center">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <p className="text-xs text-slate-400">Umumiy ball</p>
                  <p className="text-lg font-bold text-amber-400">{myRank.score}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <p className="text-xs text-slate-400">To‘g‘ri javob</p>
                  <p className="text-lg font-bold text-emerald-400">{myRank.correctCount}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <p className="text-xs text-slate-400">Xato javob</p>
                  <p className="text-lg font-bold text-rose-400">{myRank.wrongCount}</p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Leaderboard Table */}
          <div className="mb-8">
            <h3 className="text-base font-bold text-slate-200 mb-4 flex items-center space-x-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>Umumiy natijalar reytingi</span>
            </h3>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">O‘rin</th>
                      <th className="py-3 px-4">Ishtirokchi</th>
                      <th className="py-3 px-4 text-center">To‘g‘ri</th>
                      <th className="py-3 px-4 text-center">Xato</th>
                      <th className="py-3 px-4 text-right">Ball</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {leaderboard.map((entry) => {
                      const isMe = entry.participantId === participant?.id;
                      return (
                        <tr
                          key={entry.participantId}
                          className={`transition-colors ${
                            isMe ? 'bg-amber-500/10 font-semibold' : 'hover:bg-slate-900/40'
                          }`}
                        >
                          <td className="py-3 px-4">
                            {entry.rank === 1 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-400 text-slate-950 font-black text-xs">
                                1
                              </span>
                            ) : entry.rank === 2 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-slate-950 font-black text-xs">
                                2
                              </span>
                            ) : entry.rank === 3 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs">
                                3
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono text-xs">#{entry.rank}</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={isMe ? 'text-amber-300 font-bold' : 'text-slate-200'}>
                              {entry.name}
                            </span>
                            {isMe && (
                              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                Siz
                              </span>
                            )}
                            {entry.groupName && (
                              <span className="block text-[11px] text-slate-500 font-normal">
                                {entry.groupName}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center text-emerald-400 font-semibold">
                            {entry.correctCount}
                          </td>
                          <td className="py-3 px-4 text-center text-rose-400">
                            {entry.wrongCount}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-amber-400">
                            {entry.score} ball
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={handleLeaveGame}
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-colors cursor-pointer"
            >
              Bosh sahifaga qaytish
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Live Question Screen (in_progress or evaluating)
  const currentQIndex = game?.currentQuestionIndex ?? 0;
  const totalQuestions = game?.questions.length ?? 1;
  const progressPercent = totalTimeLimit > 0 ? (timeLeftSec / totalTimeLimit) * 100 : 0;
  const timerColor =
    timeLeftSec <= 10
      ? 'text-rose-400 border-rose-500 shadow-rose-500/30'
      : timeLeftSec <= 25
      ? 'text-amber-400 border-amber-500 shadow-amber-500/20'
      : 'text-emerald-400 border-emerald-500 shadow-emerald-500/15';

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-8">
      {/* Top Status Bar */}
      <div className="flex items-center justify-between mb-4 bg-slate-900/80 border border-slate-800 rounded-2xl px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
            Savol {currentQIndex + 1} / {totalQuestions}
          </span>
          {currentQuestion?.category && (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
              {currentQuestion.category}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <span className="text-slate-400 hidden sm:inline">
            Ishtirokchi: <strong className="text-white">{participant?.name}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
            {currentQuestion?.points || 1} ball
          </span>
        </div>
      </div>

      {/* Main Question Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden mb-6">
        {/* Animated Timer Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
          <div className="flex items-center space-x-4">
            {/* Circular / Badge Timer */}
            <div
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-950 border-2 flex flex-col items-center justify-center shadow-xl transition-all ${timerColor} ${
                timeLeftSec <= 10 && !isTimeUp ? 'animate-pulse scale-105' : ''
              }`}
            >
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tighter">
                {isTimeUp ? '0' : timeLeftSec}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 -mt-1">
                Soniya
              </span>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-200">
                {isTimeUp ? 'Vaqt yakunlandi' : 'Javob berish vaqti'}
              </p>
              <p className="text-xs text-slate-400">
                {isTimeUp
                  ? "Javoblar qabuli yopildi, o'qituvchi tekshirmoqda"
                  : 'Fikrlang va javobingizni pastga yozing'}
              </p>
            </div>
          </div>

          {/* Time progress bar */}
          <div className="w-full sm:w-48 bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                timeLeftSec <= 10
                  ? 'bg-rose-500'
                  : timeLeftSec <= 25
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* AI Voice Announcer Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-center space-x-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                isAiSpeaking
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                  : 'bg-slate-800 text-amber-400 border border-slate-700'
              }`}
            >
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-amber-300">AI Zakovat Boshlovchisi</span>
                {isAiSpeaking && (
                  <span className="flex items-end space-x-0.5 h-3">
                    <span className="w-1 h-3 bg-amber-400 rounded-full animate-bounce"></span>
                    <span className="w-1 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                    <span className="w-1 h-3 bg-amber-400 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {isAiSpeaking
                  ? 'Savol jarangdor ovozda o‘qilmoqda...'
                  : 'Savolni eshitish uchun tugmani bosing'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Voice style selector */}
            <select
              value={selectedVoice}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedVoice(v);
                aiVoice.setVoice(v);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 text-[11px] font-semibold outline-none cursor-pointer"
            >
              <option value="Puck">👦 Jasur (Haqiqiy o‘g‘il bola ovozi - Jonli)</option>
              <option value="Zephyr">🎙️ Sardor (Haqiqiy yosh yigit ovozi - Ravon)</option>
              <option value="Charon">🧔 Bobur (Haqiqiy rasmiy erkak ovozi)</option>
            </select>

            {isAiSpeaking ? (
              <button
                type="button"
                onClick={() => aiVoice.stopSpeaking()}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span>Ovozni to‘xtatish</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  currentQuestion &&
                  aiVoice.speakQuestion(currentQuestion.text, currentQIndex + 1, { force: true, voice: selectedVoice })
                }
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Savolni eshitish</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setAutoAiSpeak(aiVoice.toggleAutoSpeak())}
              title="Savol chiqqanda avtomatik o‘qish"
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-colors cursor-pointer ${
                autoAiSpeak
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              Avto-ovoz: {autoAiSpeak ? 'Yoqilgan' : 'O‘chirilgan'}
            </button>
          </div>
        </div>

        {/* Question Text */}
        <div className="mb-8">
          <div className="text-xs uppercase font-bold tracking-wider text-amber-400 mb-2 flex items-center space-x-1.5">
            <HelpCircle className="w-4 h-4" />
            <span>Diqqat, savol:</span>
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-medium text-slate-100 leading-relaxed sm:leading-snug">
            {currentQuestion?.text}
          </h2>
        </div>

        {/* Answer Input Section */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Sizning javobingiz
            </label>
            <div className="relative">
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                disabled={isTimeUp}
                rows={3}
                placeholder={
                  isTimeUp
                    ? 'Vaqt tugadi. Ushbu savolga javob yuborib bo‘lmaydi.'
                    : 'Javobingizni shu yerga aniq va lo‘nda yozing...'
                }
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-slate-100 placeholder:text-slate-600 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none text-base disabled:opacity-50 disabled:bg-slate-950/60 transition-all resize-none"
              />
              {isTimeUp && (
                <div className="absolute top-3 right-3 text-slate-500">
                  <Lock className="w-5 h-5" />
                </div>
              )}
            </div>
          </div>

          {/* Feedback message */}
          {submissionFeedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-center space-x-2.5 transition-all ${
                isAnswerSent
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {isAnswerSent ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span>{submissionFeedback}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-400">
              {isAnswerSent && lastSubmittedAnswer ? (
                <span className="text-emerald-400 font-medium">
                  Yuborilgan javob: <strong className="text-white">"{lastSubmittedAnswer.answerText}"</strong>
                </span>
              ) : (
                <span>Vaqt tugashidan oldin javobni jo‘nating!</span>
              )}
            </div>

            <button
              onClick={handleSubmitAnswer}
              disabled={isTimeUp || isSubmittingAnswer || !answerText.trim()}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              {isSubmittingAnswer ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{isAnswerSent ? 'Javobni yangilash' : 'Javobni yuborish'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Explanation / Answer Reveal (When evaluating or time up and teacher allows) */}
        {isTimeUp && currentQuestion?.correctAnswer && (
          <div className="mt-8 pt-6 border-t border-slate-800 bg-slate-950/60 rounded-2xl p-5 border border-slate-800/80">
            <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>To‘g‘ri javob e’lon qilindi:</span>
            </div>
            <p className="text-lg font-bold text-white mb-2">
              {currentQuestion.correctAnswer}
            </p>
            {currentQuestion.explanation && (
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                <strong className="text-amber-400">Izoh: </strong>
                {currentQuestion.explanation}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-2">
        <span>Zakovat Intellektual Klubi platformasi</span>
        <span>PIN: {game?.code}</span>
      </div>
    </div>
  );
};
