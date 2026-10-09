import {
  Game,
  Question,
  BankQuestion,
  Participant,
  Answer,
  LeaderboardEntry,
  User,
} from '../types/index.ts';

type EventCallback = (payload: any) => void;

class RealtimeClient {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private currentGameId: string | null = null;
  private currentCode: string | null = null;
  private currentRole: 'teacher' | 'student' | 'viewer' | 'admin' = 'viewer';
  private currentParticipantId: string | null = null;
  private currentName: string | null = null;
  private reconnectTimer: any = null;
  private isConnecting: boolean = false;

  constructor() {
    this.connect();
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.isConnecting = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        // Re-join active room if was in one
        if (this.currentCode || this.currentGameId) {
          this.joinRoom({
            gameCode: this.currentCode || undefined,
            gameId: this.currentGameId || undefined,
            role: this.currentRole,
            participantId: this.currentParticipantId || undefined,
            name: this.currentName || undefined,
          });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type) {
            this.dispatch(data.type, data.payload);
            // Also notify generic '*' listeners
            this.dispatch('*', data);
          }
        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
        this.scheduleReconnect();
      };
    } catch (e) {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2500);
  }

  public joinRoom(params: {
    gameCode?: string;
    gameId?: string;
    role?: 'teacher' | 'student' | 'viewer' | 'admin';
    participantId?: string;
    name?: string;
  }) {
    this.currentCode = params.gameCode || null;
    this.currentGameId = params.gameId || null;
    this.currentRole = params.role || 'viewer';
    this.currentParticipantId = params.participantId || null;
    this.currentName = params.name || null;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'join_room',
          ...params,
        })
      );
    }
  }

  public on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  public off(event: string, callback: EventCallback) {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
    }
  }

  private dispatch(event: string, payload: any) {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`Error in event listener for ${event}:`, err);
        }
      });
    }
  }
}

export const realtime = new RealtimeClient();

// REST API Helpers
export const api = {
  // Auth
  async login(username: string, password: string): Promise<{ user: User; token: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Kirishda xatolik');
    }
    return res.json();
  },

  async register(data: {
    username: string;
    name: string;
    schoolOrOrg?: string;
    role?: 'teacher' | 'admin';
  }): Promise<{ user: User; token: string }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Ro'yxatdan o'tishda xatolik");
    }
    return res.json();
  },

  async getUsers(): Promise<User[]> {
    const res = await fetch('/api/auth/users');
    const data = await res.json();
    return data.users || [];
  },

  // Bank Questions
  async getBankQuestions(category?: string, search?: string): Promise<BankQuestion[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);

    const res = await fetch(`/api/bank-questions?${params.toString()}`);
    const data = await res.json();
    return data.questions || [];
  },

  async createBankQuestion(question: Partial<BankQuestion>): Promise<BankQuestion> {
    const res = await fetch('/api/bank-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(question),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Savol saqlanmadi');
    }
    const data = await res.json();
    return data.question;
  },

  async deleteBankQuestion(id: string): Promise<void> {
    const res = await fetch(`/api/bank-questions/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error("Savol o'chirilmadi");
  },

  // Games
  async getGames(teacherId?: string): Promise<Game[]> {
    const url = teacherId ? `/api/games?teacherId=${teacherId}` : '/api/games';
    const res = await fetch(url);
    const data = await res.json();
    return data.games || [];
  },

  async getGame(idOrCode: string): Promise<{
    game: Game;
    participants: Participant[];
    answers: Answer[];
    leaderboard: LeaderboardEntry[];
  }> {
    const res = await fetch(`/api/games/${idOrCode}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "O'yin topilmadi");
    }
    return res.json();
  },

  async createGame(gameData: Partial<Game>): Promise<Game> {
    const res = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gameData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "O'yin yaratilmadi");
    }
    const data = await res.json();
    return data.game;
  },

  async updateGame(id: string, updates: Partial<Game>): Promise<Game> {
    const res = await fetch(`/api/games/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "O'yin yangilanmadi");
    }
    const data = await res.json();
    return data.game;
  },

  async duplicateGame(id: string): Promise<Game> {
    const res = await fetch(`/api/games/${id}/duplicate`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Nusxa olinmadi");
    }
    const data = await res.json();
    return data.game;
  },

  async deleteGame(id: string): Promise<void> {
    const res = await fetch(`/api/games/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error("O'yin o'chirilmadi");
  },

  // Game Control Actions
  async quickStartGame(params: {
    teacherId?: string;
    teacherName?: string;
    questionText: string;
    correctAnswer: string;
    explanation?: string;
    timeLimitSec?: number;
    gameId?: string;
    title?: string;
  }): Promise<{ game: Game; currentQuestion: Question; leaderboard: LeaderboardEntry[] }> {
    const res = await fetch('/api/games/quick-start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "O'yin boshlanmadi");
    }
    return res.json();
  },

  async startGame(gameId: string) {
    const res = await fetch(`/api/games/${gameId}/start`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "O'yin boshlanmadi");
    }
    return res.json();
  },

  async pauseGame(gameId: string) {
    const res = await fetch(`/api/games/${gameId}/pause`, { method: 'POST' });
    return res.json();
  },

  async resumeGame(gameId: string) {
    const res = await fetch(`/api/games/${gameId}/resume`, { method: 'POST' });
    return res.json();
  },

  async endTimerEarly(gameId: string) {
    const res = await fetch(`/api/games/${gameId}/end-timer`, { method: 'POST' });
    return res.json();
  },

  async nextQuestion(gameId: string) {
    const res = await fetch(`/api/games/${gameId}/next-question`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Keyingi savolga o'tib bo'lmadi");
    }
    return res.json();
  },

  async finishGame(gameId: string) {
    const res = await fetch(`/api/games/${gameId}/finish`, { method: 'POST' });
    return res.json();
  },

  async publishResults(gameId: string) {
    const res = await fetch(`/api/games/${gameId}/publish-results`, { method: 'POST' });
    return res.json();
  },

  // Review answers
  async reviewAnswer(gameId: string, answerId: string, status: 'correct' | 'wrong' | 'partial', points: number, note?: string) {
    const res = await fetch(`/api/games/${gameId}/review-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answerId, status, pointsAwarded: points, teacherNote: note }),
    });
    return res.json();
  },

  async bulkAutoReview(gameId: string, questionId: string) {
    const res = await fetch(`/api/games/${gameId}/bulk-auto-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId }),
    });
    return res.json();
  },

  async kickParticipant(gameId: string, participantId: string) {
    const res = await fetch(`/api/games/${gameId}/participants/${participantId}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  // Participant endpoints
  async joinGame(gameCode: string, name: string, studentIdOrGroup?: string): Promise<{
    participant: Participant;
    game: Game;
  }> {
    const res = await fetch('/api/participants/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameCode, name, studentIdOrGroup }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "O'yinga qo'shilib bo'lmadi");
    }
    return res.json();
  },

  async submitAnswer(data: {
    gameId: string;
    questionId: string;
    participantId: string;
    answerText: string;
  }): Promise<{ success: boolean; answer: Answer }> {
    const res = await fetch('/api/participants/submit-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Javob yuborilmadi');
    }
    return res.json();
  },

  // Admin stats
  async getAdminStats() {
    const res = await fetch('/api/admin/stats');
    return res.json();
  },

  // AI Question Generator
  async generateAIQuestion(category?: string, difficulty?: string): Promise<BankQuestion> {
    const res = await fetch('/api/ai/generate-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, difficulty }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'AI savol yaratishda xatolik');
    }
    const data = await res.json();
    return {
      id: `bq-ai-${Date.now()}`,
      text: data.question.text,
      correctAnswer: data.question.correctAnswer,
      explanation: data.question.explanation,
      category: data.question.category || 'Mantiq',
      difficulty: data.question.difficulty || 'orta',
      suggestedTimeSec: 60,
      points: 1,
      createdAt: new Date().toISOString(),
    };
  },
};
