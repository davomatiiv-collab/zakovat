import express, { Request, Response } from 'express';
import { createServer as createHttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  User,
  Game,
  Question,
  BankQuestion,
  Participant,
  Answer,
  LeaderboardEntry,
} from './src/types/index.ts';
import { SEED_BANK_QUESTIONS } from './src/data/seedQuestions.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// --- In-Memory Store & Persistence ---
interface Store {
  users: User[];
  bankQuestions: BankQuestion[];
  games: Game[];
  participants: Participant[];
  answers: Answer[];
}

function normalizeAnswerText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[‘'ʼ`’]/g, "'")
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function checkAnswerMatch(studentAnswer: string, correctAnswer: string): boolean {
  const normStudent = normalizeAnswerText(studentAnswer);
  const normCorrect = normalizeAnswerText(correctAnswer);

  if (!normStudent || !normCorrect) return false;
  if (normStudent === normCorrect) return true;

  // Split multiple accepted answers by slash, semicolon or 'yoki'
  const acceptableVariations = normCorrect
    .split(/[\/;]|\byoki\b/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const variant of acceptableVariations) {
    if (normStudent === variant) return true;
    // Check if variant is fully included in the student answer or vice-versa for brief phrasing
    if (variant.length > 3 && normStudent.includes(variant)) return true;
  }

  // Common stem match
  if (normStudent.length >= 4 && normCorrect.startsWith(normStudent)) return true;

  return false;
}

function loadInitialStore(): Store {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed.games && parsed.bankQuestions) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed reading db.json, using default seed:', err);
  }

  const initialUsers: User[] = [
    {
      id: 'u-admin',
      username: 'admin',
      name: 'Akmal Saidov (Administrator)',
      role: 'admin',
      schoolOrOrg: 'Zakovat Intellektual Klubi Boshqarmasi',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'u-teacher-1',
      username: 'muallim',
      name: 'Rustam Qosimov (Zakovat murabbiyi)',
      role: 'teacher',
      schoolOrOrg: 'Toshkent sh. 1-son IDUM',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'u-teacher-2',
      username: 'tarixchi',
      name: 'Dilnoza Karimova (Tarix fani o‘qituvchisi)',
      role: 'teacher',
      schoolOrOrg: 'Samarqand sh. 21-son maktab',
      createdAt: new Date().toISOString(),
    },
  ];

  const initialGames: Game[] = [
    {
      id: 'game-demo-1',
      code: '749201',
      title: 'Zakovat Maktab Saralash Bosqichi',
      description: "O'quvchilar o'rtasida intellektual salohiyatni oshirishga mo'ljallangan namunaviy o'yin.",
      groupName: '9-sinflar o‘rtasida',
      teacherId: 'u-teacher-1',
      teacherName: 'Rustam Qosimov (Zakovat murabbiyi)',
      status: 'waiting',
      currentQuestionIndex: 0,
      questions: SEED_BANK_QUESTIONS.slice(0, 5).map((bq, idx) => ({
        id: `q-demo-${idx + 1}`,
        order: idx + 1,
        text: bq.text,
        correctAnswer: bq.correctAnswer,
        explanation: bq.explanation,
        timeLimitSec: 60,
        points: bq.points || 1,
        category: bq.category,
      })),
      settings: {
        defaultTimeLimitSec: 60,
        defaultPoints: 1,
        allowAnswerEdit: true,
        autoProgress: false,
        caseSensitiveCheck: false,
        showLeaderboardAfterEachQuestion: true,
        revealExplanation: true,
      },
      resultsPublished: false,
      createdAt: new Date().toISOString(),
    },
  ];

  const initialStore: Store = {
    users: initialUsers,
    bankQuestions: SEED_BANK_QUESTIONS,
    games: initialGames,
    participants: [],
    answers: [],
  };

  saveStore(initialStore);
  return initialStore;
}

let store: Store = loadInitialStore();

function saveStore(dataToSave: Store = store) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error persisting store:', err);
  }
}

// Recalculate participant scores for a game
function updateParticipantStats(gameId: string) {
  const gameAnswers = store.answers.filter((a) => a.gameId === gameId);
  const gameParticipants = store.participants.filter((p) => p.gameId === gameId);

  for (const participant of gameParticipants) {
    const userAnswers = gameAnswers.filter((a) => a.participantId === participant.id);
    let totalScore = 0;
    let correct = 0;
    let wrong = 0;

    for (const ans of userAnswers) {
      totalScore += ans.pointsAwarded || 0;
      if (ans.status === 'correct') {
        correct++;
      } else if (ans.status === 'wrong') {
        wrong++;
      }
    }

    const currentQIdx = store.games.find((g) => g.id === gameId)?.currentQuestionIndex || 0;
    const answeredCount = userAnswers.length;
    const unanswered = Math.max(0, currentQIdx + 1 - answeredCount);

    participant.score = totalScore;
    participant.correctCount = correct;
    participant.wrongCount = wrong;
    participant.unansweredCount = unanswered;
  }
}

function calculateLeaderboard(gameId: string): LeaderboardEntry[] {
  updateParticipantStats(gameId);
  const gameParts = store.participants.filter((p) => p.gameId === gameId);
  const gameAnswers = store.answers.filter((a) => a.gameId === gameId);

  const sorted = [...gameParts].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.correctCount - a.correctCount;
  });

  return sorted.map((p, idx) => {
    const pAnswers = gameAnswers.filter((a) => a.participantId === p.id);
    const totalTime = pAnswers.reduce((sum, a) => sum + (a.timeTakenSec || 0), 0);

    return {
      rank: idx + 1,
      participantId: p.id,
      name: p.name,
      groupName: p.studentIdOrGroup,
      score: p.score,
      correctCount: p.correctCount,
      wrongCount: p.wrongCount,
      unansweredCount: p.unansweredCount,
      totalAnswerTimeSec: Math.round(totalTime),
    };
  });
}

// Generate random 6-digit numeric game code
function generateGameCode(): string {
  let code = '';
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (store.games.some((g) => g.code === code && g.status !== 'finished'));
  return code;
}

// --- WebSocket Room Management ---
interface ClientConnection {
  ws: WebSocket;
  gameId?: string;
  gameCode?: string;
  role: 'teacher' | 'student' | 'viewer' | 'admin';
  participantId?: string;
  name?: string;
}

const clients = new Set<ClientConnection>();

function broadcastToGame(gameId: string, event: { type: string; payload: any }) {
  const json = JSON.stringify(event);
  for (const client of clients) {
    if (client.gameId === gameId && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(json);
      } catch (err) {
        console.error('Error broadcasting to client:', err);
      }
    }
  }
}

// Server Authoritative Timer Loop
setInterval(() => {
  const now = Date.now();
  for (const game of store.games) {
    if (game.status === 'in_progress' && !game.isTimerPaused && game.questionDeadline) {
      const remainingMs = game.questionDeadline - now;

      if (remainingMs <= 0) {
        // Time expired!
        game.status = 'evaluating';
        game.questionDeadline = 0;
        game.timerRemainingMs = 0;
        saveStore();

        broadcastToGame(game.id, {
          type: 'time_up',
          payload: {
            gameId: game.id,
            questionIndex: game.currentQuestionIndex,
            currentQuestion: game.questions[game.currentQuestionIndex],
          },
        });

        broadcastToGame(game.id, {
          type: 'game_state',
          payload: { game, leaderboard: calculateLeaderboard(game.id) },
        });
      }
    }
  }
}, 500);

// --- Express App & Routes ---
const app = express();
app.use(express.json());

// Auth Endpoints
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  const user = store.users.find((u) => u.username.toLowerCase() === (username || '').toLowerCase());

  if (!user) {
    return res.status(401).json({ error: 'Foydalanuvchi topilmadi' });
  }

  // Simple demo credentials verification
  if (
    (username === 'admin' && password === 'admin123') ||
    (username === 'muallim' && password === 'muallim123') ||
    (username === 'tarixchi' && password === 'tarix123') ||
    password === 'zakovat123' ||
    password === '123456'
  ) {
    return res.json({ user, token: `zakovat-token-${user.id}` });
  }

  return res.status(401).json({ error: "Noto'g'ri parol" });
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { username, name, schoolOrOrg, role = 'teacher' } = req.body;
  if (!username || !name) {
    return res.status(400).json({ error: 'Barcha maydonlarni to‘ldiring' });
  }

  if (store.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(400).json({ error: 'Ushbu login band, boshqa login tanlang' });
  }

  const newUser: User = {
    id: `u-${Date.now()}`,
    username,
    name,
    role: role as 'teacher' | 'admin',
    schoolOrOrg,
    createdAt: new Date().toISOString(),
  };

  store.users.push(newUser);
  saveStore();
  return res.json({ user: newUser, token: `zakovat-token-${newUser.id}` });
});

app.get('/api/auth/users', (req: Request, res: Response) => {
  res.json({ users: store.users });
});

// Bank Questions Endpoints
app.get('/api/bank-questions', (req: Request, res: Response) => {
  const { category, search } = req.query;
  let list = store.bankQuestions;

  if (category && category !== 'all') {
    list = list.filter((q) => q.category.toLowerCase() === (category as string).toLowerCase());
  }

  if (search) {
    const s = (search as string).toLowerCase();
    list = list.filter((q) => q.text.toLowerCase().includes(s) || q.correctAnswer.toLowerCase().includes(s));
  }

  res.json({ questions: list });
});

app.post('/api/bank-questions', (req: Request, res: Response) => {
  const { text, correctAnswer, explanation, category, difficulty = 'orta', suggestedTimeSec = 60, points = 1 } = req.body;
  if (!text || !correctAnswer) {
    return res.status(400).json({ error: 'Savol matni va to‘g‘ri javob kiritilishi shart' });
  }

  const newQuestion: BankQuestion = {
    id: `bq-${Date.now()}`,
    text,
    correctAnswer,
    explanation,
    category: category || 'Umumiy',
    difficulty,
    suggestedTimeSec: Number(suggestedTimeSec) || 60,
    points: Number(points) || 1,
    createdAt: new Date().toISOString(),
  };

  store.bankQuestions.unshift(newQuestion);
  saveStore();
  res.json({ question: newQuestion });
});

app.delete('/api/bank-questions/:id', (req: Request, res: Response) => {
  store.bankQuestions = store.bankQuestions.filter((q) => q.id !== req.params.id);
  saveStore();
  res.json({ success: true });
});

// Games Endpoints
app.get('/api/games', (req: Request, res: Response) => {
  const { teacherId } = req.query;
  let list = store.games;
  if (teacherId) {
    list = list.filter((g) => g.teacherId === teacherId);
  }
  res.json({ games: list });
});

app.get('/api/games/:idOrCode', (req: Request, res: Response) => {
  const idOrCode = req.params.idOrCode;
  const game = store.games.find((g) => g.id === idOrCode || g.code === idOrCode);

  if (!game) {
    return res.status(404).json({ error: 'O‘yin topilmadi' });
  }

  const participants = store.participants.filter((p) => p.gameId === game.id);
  const answers = store.answers.filter((a) => a.gameId === game.id);
  const leaderboard = calculateLeaderboard(game.id);

  res.json({ game, participants, answers, leaderboard });
});

app.post('/api/games', (req: Request, res: Response) => {
  const {
    title,
    description,
    groupName,
    teacherId,
    teacherName,
    questions = [],
    settings = {},
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'O‘yin nomi kiritilishi shart' });
  }

  const code = generateGameCode();
  const defaultTime = Number(settings.defaultTimeLimitSec) || 60;
  const defaultPts = Number(settings.defaultPoints) || 1;

  const formattedQuestions: Question[] = questions.map((q: any, idx: number) => ({
    id: q.id || `q-${Date.now()}-${idx}`,
    order: idx + 1,
    text: q.text,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation || '',
    timeLimitSec: Number(q.timeLimitSec) || defaultTime,
    points: Number(q.points) || defaultPts,
    category: q.category || 'Umumiy',
    imageUrl: q.imageUrl,
  }));

  const newGame: Game = {
    id: `game-${Date.now()}`,
    code,
    title,
    description: description || '',
    groupName: groupName || '',
    teacherId: teacherId || 'u-teacher-1',
    teacherName: teacherName || 'Zakovat murabbiyi',
    status: 'waiting',
    currentQuestionIndex: 0,
    questions: formattedQuestions,
    settings: {
      defaultTimeLimitSec: defaultTime,
      defaultPoints: defaultPts,
      allowAnswerEdit: settings.allowAnswerEdit ?? true,
      autoProgress: settings.autoProgress ?? false,
      caseSensitiveCheck: settings.caseSensitiveCheck ?? false,
      showLeaderboardAfterEachQuestion: settings.showLeaderboardAfterEachQuestion ?? true,
      revealExplanation: settings.revealExplanation ?? true,
    },
    resultsPublished: false,
    createdAt: new Date().toISOString(),
  };

  store.games.unshift(newGame);
  saveStore();
  res.json({ game: newGame });
});

app.post('/api/games/:id/duplicate', (req: Request, res: Response) => {
  const original = store.games.find((g) => g.id === req.params.id);
  if (!original) {
    return res.status(404).json({ error: 'O‘yin topilmadi' });
  }

  const newCode = generateGameCode();
  const duplicatedGame: Game = {
    ...original,
    id: `game-${Date.now()}`,
    code: newCode,
    title: `${original.title} (Nusxa)`,
    status: 'waiting',
    currentQuestionIndex: 0,
    questionDeadline: undefined,
    timerRemainingMs: undefined,
    isTimerPaused: false,
    resultsPublished: false,
    createdAt: new Date().toISOString(),
  };

  store.games.unshift(duplicatedGame);
  saveStore();
  res.json({ game: duplicatedGame });
});

app.put('/api/games/:id', (req: Request, res: Response) => {
  const index = store.games.findIndex((g) => g.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'O‘yin topilmadi' });
  }

  const existing = store.games[index];
  const { title, description, groupName, questions, settings } = req.body;

  store.games[index] = {
    ...existing,
    title: title ?? existing.title,
    description: description ?? existing.description,
    groupName: groupName ?? existing.groupName,
    questions: questions ? questions.map((q: any, idx: number) => ({ ...q, order: idx + 1 })) : existing.questions,
    settings: settings ? { ...existing.settings, ...settings } : existing.settings,
  };

  saveStore();
  broadcastToGame(existing.id, {
    type: 'game_state',
    payload: { game: store.games[index], leaderboard: calculateLeaderboard(existing.id) },
  });

  res.json({ game: store.games[index] });
});

app.delete('/api/games/:id', (req: Request, res: Response) => {
  store.games = store.games.filter((g) => g.id !== req.params.id);
  store.participants = store.participants.filter((p) => p.gameId !== req.params.id);
  store.answers = store.answers.filter((a) => a.gameId !== req.params.id);
  saveStore();
  res.json({ success: true });
});

// Quick-start 1-click Game Launcher (Teacher types question & clicks start)
app.post('/api/games/quick-start', (req: Request, res: Response) => {
  const {
    teacherId,
    teacherName,
    questionText,
    correctAnswer,
    explanation,
    timeLimitSec = 60,
    gameId,
    title,
  } = req.body;

  if (!questionText || !correctAnswer) {
    return res.status(400).json({ error: 'Savol matni va to‘g‘ri javob kiritilishi shart' });
  }

  let targetGame: Game | undefined;
  if (gameId) {
    targetGame = store.games.find((g) => g.id === gameId);
  }

  const limitSec = Number(timeLimitSec) || 60;
  const now = Date.now();

  const questionObj: Question = {
    id: `q-${Date.now()}`,
    order: targetGame ? targetGame.questions.length + 1 : 1,
    text: questionText.trim(),
    correctAnswer: correctAnswer.trim(),
    explanation: (explanation || '').trim(),
    timeLimitSec: limitSec,
    points: 1,
    category: 'Mantiqiy savol',
  };

  let activeGame: Game;

  if (!targetGame) {
    const newCode = generateGameCode();
    activeGame = {
      id: `game-${Date.now()}`,
      code: newCode,
      title: title?.trim() || `Zakovat Intellektual O‘yini #${newCode}`,
      teacherId: teacherId || 'u-teacher-1',
      teacherName: teacherName || 'Zakovat murabbiyi',
      status: 'in_progress',
      currentQuestionIndex: 0,
      startedAt: new Date().toISOString(),
      timerStartedAt: now,
      questionDeadline: now + limitSec * 1000,
      timerRemainingMs: limitSec * 1000,
      isTimerPaused: false,
      resultsPublished: false,
      questions: [questionObj],
      createdAt: new Date().toISOString(),
      settings: {
        defaultTimeLimitSec: limitSec,
        defaultPoints: 1,
        allowAnswerEdit: true,
        autoProgress: false,
        caseSensitiveCheck: false,
        showLeaderboardAfterEachQuestion: true,
        revealExplanation: true,
      },
    };
    store.games.unshift(activeGame);
  } else {
    activeGame = targetGame;
    if (activeGame.status === 'waiting' && activeGame.questions.length === 0) {
      activeGame.questions = [questionObj];
      activeGame.currentQuestionIndex = 0;
    } else {
      activeGame.questions.push(questionObj);
      activeGame.currentQuestionIndex = activeGame.questions.length - 1;
    }

    activeGame.status = 'in_progress';
    activeGame.isTimerPaused = false;
    activeGame.timerStartedAt = now;
    activeGame.questionDeadline = now + limitSec * 1000;
    activeGame.timerRemainingMs = limitSec * 1000;
    activeGame.startedAt = activeGame.startedAt || new Date().toISOString();
  }

  saveStore();

  const currentQ = activeGame.questions[activeGame.currentQuestionIndex];
  const payload = {
    game: activeGame,
    currentQuestion: {
      ...currentQ,
      correctAnswer: undefined,
      explanation: undefined,
    },
    leaderboard: calculateLeaderboard(activeGame.id),
  };

  broadcastToGame(activeGame.id, { type: 'game_started', payload });
  broadcastToGame(activeGame.id, {
    type: 'question_changed',
    payload: {
      game: activeGame,
      questionIndex: activeGame.currentQuestionIndex,
      question: currentQ,
      leaderboard: calculateLeaderboard(activeGame.id),
    },
  });

  res.json({
    game: activeGame,
    currentQuestion: currentQ,
    leaderboard: calculateLeaderboard(activeGame.id),
  });
});

// Game Control Endpoints
app.post('/api/games/:id/start', (req: Request, res: Response) => {
  const game = store.games.find((g) => g.id === req.params.id);
  if (!game) return res.status(404).json({ error: 'O‘yin topilmadi' });

  if (game.questions.length === 0) {
    return res.status(400).json({ error: 'O‘yinda kamida 1 ta savol bo‘lishi kerak' });
  }

  const currentQ = game.questions[game.currentQuestionIndex || 0];
  const limitSec = currentQ.timeLimitSec || 60;

  game.status = 'in_progress';
  game.isTimerPaused = false;
  game.timerStartedAt = Date.now();
  game.questionDeadline = Date.now() + limitSec * 1000;
  game.timerRemainingMs = limitSec * 1000;
  game.startedAt = game.startedAt || new Date().toISOString();

  saveStore();

  const payload = {
    game,
    currentQuestion: {
      ...currentQ,
      correctAnswer: undefined, // Hide correct answer from public broadcast
      explanation: undefined,
    },
    leaderboard: calculateLeaderboard(game.id),
  };

  broadcastToGame(game.id, { type: 'game_started', payload });
  res.json(payload);
});

app.post('/api/games/:id/pause', (req: Request, res: Response) => {
  const game = store.games.find((g) => g.id === req.params.id);
  if (!game || game.status !== 'in_progress') return res.status(400).json({ error: 'O‘yin faol emas' });

  const now = Date.now();
  const remaining = Math.max(0, (game.questionDeadline || now) - now);
  game.isTimerPaused = true;
  game.timerRemainingMs = remaining;

  saveStore();
  broadcastToGame(game.id, { type: 'timer_paused', payload: { game, remainingMs: remaining } });
  res.json({ game });
});

app.post('/api/games/:id/resume', (req: Request, res: Response) => {
  const game = store.games.find((g) => g.id === req.params.id);
  if (!game || game.status !== 'in_progress') return res.status(400).json({ error: 'O‘yin faol emas' });

  const remaining = game.timerRemainingMs || 30000;
  game.isTimerPaused = false;
  game.questionDeadline = Date.now() + remaining;

  saveStore();
  broadcastToGame(game.id, { type: 'timer_resumed', payload: { game, questionDeadline: game.questionDeadline } });
  res.json({ game });
});

app.post('/api/games/:id/end-timer', (req: Request, res: Response) => {
  const game = store.games.find((g) => g.id === req.params.id);
  if (!game) return res.status(404).json({ error: 'O‘yin topilmadi' });

  game.status = 'evaluating';
  game.questionDeadline = 0;
  game.timerRemainingMs = 0;

  saveStore();
  broadcastToGame(game.id, {
    type: 'time_up',
    payload: {
      gameId: game.id,
      questionIndex: game.currentQuestionIndex,
      currentQuestion: game.questions[game.currentQuestionIndex],
    },
  });
  broadcastToGame(game.id, {
    type: 'game_state',
    payload: { game, leaderboard: calculateLeaderboard(game.id) },
  });

  res.json({ game });
});

app.post('/api/games/:id/next-question', (req: Request, res: Response) => {
  const game = store.games.find((g) => g.id === req.params.id);
  if (!game) return res.status(404).json({ error: 'O‘yin topilmadi' });

  if (game.currentQuestionIndex + 1 < game.questions.length) {
    game.currentQuestionIndex += 1;
    const nextQ = game.questions[game.currentQuestionIndex];
    const limitSec = nextQ.timeLimitSec || 60;

    game.status = 'in_progress';
    game.isTimerPaused = false;
    game.timerStartedAt = Date.now();
    game.questionDeadline = Date.now() + limitSec * 1000;
    game.timerRemainingMs = limitSec * 1000;

    saveStore();

    broadcastToGame(game.id, {
      type: 'question_changed',
      payload: {
        game,
        questionIndex: game.currentQuestionIndex,
        question: nextQ,
        leaderboard: calculateLeaderboard(game.id),
      },
    });

    res.json({ game });
  } else {
    // Finished!
    game.status = 'finished';
    game.finishedAt = new Date().toISOString();
    saveStore();

    broadcastToGame(game.id, {
      type: 'game_finished',
      payload: { game, leaderboard: calculateLeaderboard(game.id) },
    });

    res.json({ game, message: 'Barcha savollar yakunlandi' });
  }
});

app.post('/api/games/:id/finish', (req: Request, res: Response) => {
  const game = store.games.find((g) => g.id === req.params.id);
  if (!game) return res.status(404).json({ error: 'O‘yin topilmadi' });

  game.status = 'finished';
  game.finishedAt = new Date().toISOString();
  saveStore();

  broadcastToGame(game.id, {
    type: 'game_finished',
    payload: { game, leaderboard: calculateLeaderboard(game.id) },
  });

  res.json({ game });
});

app.post('/api/games/:id/publish-results', (req: Request, res: Response) => {
  const game = store.games.find((g) => g.id === req.params.id);
  if (!game) return res.status(404).json({ error: 'O‘yin topilmadi' });

  game.resultsPublished = true;
  saveStore();

  broadcastToGame(game.id, {
    type: 'results_published',
    payload: { game, leaderboard: calculateLeaderboard(game.id) },
  });

  res.json({ game, leaderboard: calculateLeaderboard(game.id) });
});

// Participant Join & Submit Answer Endpoints
app.post('/api/participants/join', (req: Request, res: Response) => {
  const { gameCode, name, studentIdOrGroup } = req.body;
  if (!gameCode || !name) {
    return res.status(400).json({ error: 'O‘yin kodi va ismingizni kiriting' });
  }

  const game = store.games.find((g) => g.code.trim() === gameCode.trim());
  if (!game) {
    return res.status(404).json({ error: "Ushbu kodga ega o'yin topilmadi" });
  }

  if (game.status === 'finished') {
    return res.status(400).json({ error: 'Ushbu o‘yin allaqachon yakunlangan' });
  }

  // Check if participant already exists in this game by name
  let participant = store.participants.find(
    (p) => p.gameId === game.id && p.name.trim().toLowerCase() === name.trim().toLowerCase()
  );

  if (!participant) {
    participant = {
      id: `p-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      gameId: game.id,
      name: name.trim(),
      studentIdOrGroup: studentIdOrGroup?.trim() || '',
      joinedAt: new Date().toISOString(),
      isOnline: true,
      score: 0,
      correctCount: 0,
      wrongCount: 0,
      unansweredCount: 0,
    };
    store.participants.push(participant);
    saveStore();
  } else {
    participant.isOnline = true;
  }

  broadcastToGame(game.id, {
    type: 'participant_joined',
    payload: { participant, totalCount: store.participants.filter((p) => p.gameId === game.id).length },
  });

  res.json({
    participant,
    game: {
      ...game,
      // If student joins during question, do not reveal correct answers
      questions: game.questions.map((q) => ({
        ...q,
        correctAnswer: game.status === 'finished' ? q.correctAnswer : '',
        explanation: game.status === 'finished' ? q.explanation : '',
      })),
    },
  });
});

app.post('/api/participants/submit-answer', (req: Request, res: Response) => {
  const { gameId, questionId, participantId, answerText } = req.body;
  const game = store.games.find((g) => g.id === gameId);

  if (!game) return res.status(404).json({ error: 'O‘yin topilmadi' });
  if (game.status !== 'in_progress') {
    return res.status(400).json({ error: 'Hozir javob qabul qilinmaydi (vaqt tugagan)' });
  }

  // Server-authoritative time check (+1500ms network tolerance)
  const now = Date.now();
  if (game.questionDeadline && now > game.questionDeadline + 1500) {
    return res.status(400).json({ error: 'Savol vaqti tugadi! Javob qabul qilinmadi' });
  }

  const currentQ = game.questions.find((q) => q.id === questionId) || game.questions[game.currentQuestionIndex];
  if (!currentQ) {
    return res.status(404).json({ error: 'Savol topilmadi' });
  }

  const participant = store.participants.find((p) => p.id === participantId);
  if (!participant) {
    return res.status(404).json({ error: 'Ishtirokchi topilmadi' });
  }

  // Check existing answer
  const existingIndex = store.answers.findIndex(
    (a) => a.gameId === gameId && a.questionId === currentQ.id && a.participantId === participantId
  );

  if (existingIndex !== -1 && !game.settings.allowAnswerEdit) {
    return res.status(400).json({ error: 'Javobni qayta tahrirlashga ruxsat berilmagan' });
  }

  const isMatched = checkAnswerMatch(answerText, currentQ.correctAnswer);
  const timeTaken = game.timerStartedAt ? Math.round((now - game.timerStartedAt) / 1000) : 0;

  const answerRecord: Answer = {
    id: existingIndex !== -1 ? store.answers[existingIndex].id : `ans-${Date.now()}-${participantId}`,
    gameId,
    questionId: currentQ.id,
    participantId,
    participantName: participant.name,
    answerText: (answerText || '').trim(),
    submittedAt: new Date().toISOString(),
    timeTakenSec: timeTaken,
    status: isMatched ? 'correct' : 'pending',
    pointsAwarded: isMatched ? currentQ.points : 0,
    autoMatched: isMatched,
  };

  if (existingIndex !== -1) {
    store.answers[existingIndex] = answerRecord;
  } else {
    store.answers.push(answerRecord);
  }

  updateParticipantStats(gameId);
  saveStore();

  broadcastToGame(gameId, {
    type: 'answer_received',
    payload: {
      questionId: currentQ.id,
      participantId,
      participantName: participant.name,
      answer: answerRecord,
      totalAnswersForQuestion: store.answers.filter((a) => a.gameId === gameId && a.questionId === currentQ.id).length,
    },
  });

  res.json({ success: true, answer: answerRecord });
});

// Teacher Answer Review & Overrule Endpoints
app.post('/api/games/:id/review-answer', (req: Request, res: Response) => {
  const { answerId, status, pointsAwarded, teacherNote } = req.body;
  const answer = store.answers.find((a) => a.id === answerId);

  if (!answer) return res.status(404).json({ error: 'Javob topilmadi' });

  answer.status = status;
  answer.pointsAwarded = Number(pointsAwarded) || 0;
  if (teacherNote !== undefined) answer.teacherNote = teacherNote;

  updateParticipantStats(req.params.id);
  saveStore();

  broadcastToGame(req.params.id, {
    type: 'answer_evaluated',
    payload: {
      answer,
      leaderboard: calculateLeaderboard(req.params.id),
    },
  });

  res.json({ answer, leaderboard: calculateLeaderboard(req.params.id) });
});

app.post('/api/games/:id/bulk-auto-review', (req: Request, res: Response) => {
  const { questionId } = req.body;
  const game = store.games.find((g) => g.id === req.params.id);
  if (!game) return res.status(404).json({ error: 'O‘yin topilmadi' });

  const question = game.questions.find((q) => q.id === questionId) || game.questions[game.currentQuestionIndex];
  if (!question) return res.status(404).json({ error: 'Savol topilmadi' });

  const qAnswers = store.answers.filter((a) => a.gameId === game.id && a.questionId === question.id);
  let updatedCount = 0;

  for (const ans of qAnswers) {
    const isMatched = checkAnswerMatch(ans.answerText, question.correctAnswer);
    ans.status = isMatched ? 'correct' : 'wrong';
    ans.pointsAwarded = isMatched ? question.points : 0;
    ans.autoMatched = isMatched;
    updatedCount++;
  }

  updateParticipantStats(game.id);
  saveStore();

  const lb = calculateLeaderboard(game.id);
  broadcastToGame(game.id, {
    type: 'game_state',
    payload: { game, leaderboard: lb },
  });

  res.json({ success: true, updatedCount, answers: qAnswers, leaderboard: lb });
});

// Participant Management (Kick / Remove)
app.delete('/api/games/:id/participants/:pId', (req: Request, res: Response) => {
  const { id: gameId, pId } = req.params;
  store.participants = store.participants.filter((p) => !(p.gameId === gameId && p.id === pId));
  store.answers = store.answers.filter((a) => !(a.gameId === gameId && a.participantId === pId));
  saveStore();

  broadcastToGame(gameId, {
    type: 'participant_kicked',
    payload: { participantId: pId },
  });

  res.json({ success: true });
});

// Admin Stats Endpoint
app.get('/api/admin/stats', (req: Request, res: Response) => {
  res.json({
    totalUsers: store.users.length,
    totalTeachers: store.users.filter((u) => u.role === 'teacher').length,
    totalGames: store.games.length,
    activeGames: store.games.filter((g) => g.status === 'in_progress').length,
    totalBankQuestions: store.bankQuestions.length,
    totalParticipants: store.participants.length,
    totalAnswers: store.answers.length,
  });
});

// --- AI Services (Gemini TTS & Question Generation) ---
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// --- In-Memory Audio Cache ---
const audioCache = new Map<string, string>();

// Helper to format text into natural, fluent human-like spoken Uzbek
function formatQuestionForSpeech(rawText: string, order?: number): string {
  const ordinalNumbers: Record<number, string> = {
    1: 'birinchi',
    2: 'ikkinchi',
    3: 'uchinchi',
    4: 'to‘rtinchi',
    5: 'beshinchi',
    6: 'oltinchi',
    7: 'yettinchi',
    8: 'sakkizinchi',
    9: 'to‘qqizinchi',
    10: 'o‘ninchi',
    11: 'o‘n birinchi',
    12: 'o‘n ikkinchi',
    13: 'o‘n uchinchi',
    14: 'o‘n to‘rtinchi',
    15: 'o‘n beshinchi',
  };

  let cleanText = (rawText || '').trim();
  // Remove redundant leading 'Diqqat, savol:' if already in text
  cleanText = cleanText.replace(/^(diqqat,?\s*savol:?\s*)/i, '');
  cleanText = cleanText.replace(/['`’ʼ]/g, '’');

  const orderWord = order && ordinalNumbers[order] ? ordinalNumbers[order] : (order ? `${order}-` : '');
  const prefix = orderWord ? `Diqqat, ${orderWord} savol.` : 'Diqqat, savol.';

  return `${prefix} <breath> ${cleanText}. <breath> Vaqt ketdi!`;
}

// AI Voice Host TTS: speak the Zakovat question in a hyper-realistic human boy voice
app.post('/api/ai/speak-question', async (req: Request, res: Response) => {
  try {
    const { text, order, voiceName = 'Puck', isAnnouncement } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Savol matni kiritilmagan' });
    }

    const selectedVoice = voiceName || 'Puck';
    const spokenPrompt = isAnnouncement ? text.trim() : formatQuestionForSpeech(text, order);

    // 1. Check in-memory audio cache for instant playback
    const cacheKey = `${selectedVoice}_${isAnnouncement ? 'ann_' : (order || 0)}_${text.trim()}`;
    if (audioCache.has(cacheKey)) {
      return res.json({
        audioBase64: audioCache.get(cacheKey),
        mimeType: 'audio/wav',
        promptText: spokenPrompt,
        voice: selectedVoice,
        cached: true,
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        fallback: true,
        message: 'GEMINI_API_KEY mavjud emas, brauzer ovozidan foydalaniladi',
      });
    }

    // 2. Call Flagship Gemini 3.8 Flash TTS for ultra-realistic human audio
    let base64Audio: string | undefined;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: spokenPrompt,
                speechMetadata: {
                  speaker: 'ZakovatBoshlovchi',
                  style:
                    'O‘zbek tilida gapiradigan nihoyatda ravon, jonli, samimiy va yorqin yosh o‘g‘il bola diktor ovozi. Haqiqiy inson kabi tabiiy nafas olish va ifodali intonatsiya bilan gapirsin.',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (primaryErr: any) {
      console.warn('gemini-3.8-flash-tts failed, trying gemini-3.8-flash-lite-tts:', primaryErr.message);

      // Try fallback to lite tts model
      try {
        const fallbackResp = await ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: spokenPrompt.replace(/<breath>/g, ''),
                  speechMetadata: {
                    style: 'Ravon yosh o‘g‘il bola diktor ovozi, haqiqiy insondek tabiiy',
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: selectedVoice },
              },
            },
          },
        });
        base64Audio = fallbackResp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      } catch (secErr) {
        console.warn('Both Gemini TTS models failed:', secErr);
      }
    }

    if (!base64Audio) {
      return res.json({ fallback: true });
    }

    // Store in cache for zero-latency replays
    audioCache.set(cacheKey, base64Audio);

    res.json({
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
      promptText: spokenPrompt,
      voice: selectedVoice,
    });
  } catch (err: any) {
    console.error('Gemini TTS error:', err);
    res.json({ fallback: true, error: err.message });
  }
});

// AI Question Generator: creates high-caliber Zakovat questions in Uzbek
app.post('/api/ai/generate-question', async (req: Request, res: Response) => {
  const { category = 'Tarix', difficulty = 'orta' } = req.body;
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY mavjud emas' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `O'zbek tilidagi rasmiy "Zakovat" intellektual o'yini uchun yangi, juda qiziqarli, mantiqiy va chuqur bilim talab qiladigan savol tuzing. Kategoriya: ${category}, Qiyinlik darajasi: ${difficulty}. Savol aniq faktga asoslansin, noaniq bo'lmasin.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: {
              type: Type.STRING,
              description: "Zakovat savoli matni. Oxirida 'Diqqat, savol: ...' iborasi bilan tugallangan bo'lsin.",
            },
            correctAnswer: {
              type: Type.STRING,
              description: "Savolning aniq to'g'ri javobi.",
            },
            explanation: {
              type: Type.STRING,
              description: "Javobning batafsil mantiqiy va tarixiy izohi.",
            },
            category: {
              type: Type.STRING,
              description: "Savol kategoriyasi (masalan: Tarix, Adabiyot, Mantiq, Fan va texnika, San'at).",
            },
            difficulty: {
              type: Type.STRING,
              description: "Qiyinlik darajasi: oson, orta yoki qiyin.",
            },
          },
          required: ['text', 'correctAnswer', 'explanation', 'category', 'difficulty'],
        },
      },
    });

    const result = JSON.parse(response.text || '{}');
    res.json({ question: result });
  } catch (err: any) {
    console.error('Gemini question generation error, using curated pool fallback:', err);
    // Pick an authentic curated Zakovat question as resilient fallback
    const filtered = SEED_BANK_QUESTIONS.filter(
      (q) => !category || q.category.toLowerCase() === category.toLowerCase()
    );
    const fallbackQ = (filtered.length > 0 ? filtered : SEED_BANK_QUESTIONS)[
      Math.floor(Math.random() * (filtered.length > 0 ? filtered.length : SEED_BANK_QUESTIONS.length))
    ];
    res.json({
      question: {
        text: fallbackQ.text,
        correctAnswer: fallbackQ.correctAnswer,
        explanation: fallbackQ.explanation,
        category: fallbackQ.category,
        difficulty: fallbackQ.difficulty,
      },
    });
  }
});

// --- HTTP Server & WebSocket Server Setup ---
const httpServer = createHttpServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

wss.on('connection', (ws: WebSocket) => {
  const client: ClientConnection = { ws, role: 'viewer' };
  clients.add(client);

  ws.on('message', (messageRaw: string) => {
    try {
      const data = JSON.parse(messageRaw.toString());
      if (data.type === 'join_room') {
        const { gameCode, gameId, role, participantId, name } = data;
        const targetGame = store.games.find((g) => g.code === gameCode || g.id === gameId);

        if (targetGame) {
          client.gameId = targetGame.id;
          client.gameCode = targetGame.code;
          client.role = role || 'viewer';
          client.participantId = participantId;
          client.name = name;

          // Send immediate state sync
          const lb = calculateLeaderboard(targetGame.id);
          const currentQ = targetGame.questions[targetGame.currentQuestionIndex];
          const shouldHideAnswer = client.role === 'student' && targetGame.status !== 'finished';

          ws.send(
            JSON.stringify({
              type: 'game_state',
              payload: {
                game: {
                  ...targetGame,
                  questions: targetGame.questions.map((q) => ({
                    ...q,
                    correctAnswer: shouldHideAnswer ? '' : q.correctAnswer,
                    explanation: shouldHideAnswer ? '' : q.explanation,
                  })),
                },
                currentQuestion: currentQ
                  ? {
                      ...currentQ,
                      correctAnswer: shouldHideAnswer ? '' : currentQ.correctAnswer,
                      explanation: shouldHideAnswer ? '' : currentQ.explanation,
                    }
                  : null,
                participants: store.participants.filter((p) => p.gameId === targetGame.id),
                answers: client.role === 'teacher' || client.role === 'admin'
                  ? store.answers.filter((a) => a.gameId === targetGame.id)
                  : store.answers.filter((a) => a.gameId === targetGame.id && a.participantId === participantId),
                leaderboard: lb,
              },
            })
          );
        }
      }
    } catch (err) {
      console.error('WebSocket message parsing error:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(client);
    if (client.gameId && client.participantId) {
      const p = store.participants.find((item) => item.id === client.participantId);
      if (p) {
        p.isOnline = false;
        broadcastToGame(client.gameId, {
          type: 'participant_left',
          payload: { participantId: client.participantId },
        });
      }
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket client error:', err);
    clients.delete(client);
  });
});

// --- Vite Middleware Integration in Dev ---
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Zakovat server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
