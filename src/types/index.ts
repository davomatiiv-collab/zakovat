export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  schoolOrOrg?: string;
  createdAt: string;
}

export type GameStatus = 'waiting' | 'in_progress' | 'paused' | 'evaluating' | 'finished';

export interface Question {
  id: string;
  gameId?: string;
  order: number;
  text: string;
  correctAnswer: string;
  explanation?: string;
  timeLimitSec: number; // default 60
  points: number; // default 1
  category: string;
  imageUrl?: string;
  sourceOrAuthor?: string;
}

export interface BankQuestion {
  id: string;
  text: string;
  correctAnswer: string;
  explanation?: string;
  category: string;
  difficulty: 'oson' | 'orta' | 'qiyin';
  suggestedTimeSec: number;
  points: number;
  createdAt: string;
}

export interface Participant {
  id: string;
  gameId: string;
  name: string;
  studentIdOrGroup?: string;
  joinedAt: string;
  isOnline: boolean;
  score: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
}

export interface Answer {
  id: string;
  gameId: string;
  questionId: string;
  participantId: string;
  participantName: string;
  answerText: string;
  submittedAt: string;
  timeTakenSec: number;
  status: 'pending' | 'correct' | 'wrong' | 'partial';
  pointsAwarded: number;
  teacherNote?: string;
  autoMatched?: boolean;
}

export interface GameSettings {
  defaultTimeLimitSec: number; // e.g. 60
  defaultPoints: number; // e.g. 1
  allowAnswerEdit: boolean; // allow edit before time expires
  autoProgress: boolean; // whether to jump to next question automatically
  caseSensitiveCheck: boolean; // default false
  showLeaderboardAfterEachQuestion: boolean;
  revealExplanation: boolean;
}

export interface Game {
  id: string;
  code: string; // 6-character room PIN
  title: string;
  description?: string;
  groupName?: string;
  teacherId: string;
  teacherName: string;
  status: GameStatus;
  currentQuestionIndex: number;
  questionDeadline?: number; // timestamp in ms when current question expires
  timerRemainingMs?: number; // remaining ms when paused
  timerStartedAt?: number;
  isTimerPaused?: boolean;
  questions: Question[];
  settings: GameSettings;
  resultsPublished: boolean;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface LeaderboardEntry {
  rank: number;
  participantId: string;
  name: string;
  groupName?: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  totalAnswerTimeSec: number;
}

export interface ServerToClientEvents {
  type:
    | 'game_state'
    | 'participant_joined'
    | 'participant_left'
    | 'participant_kicked'
    | 'game_started'
    | 'question_changed'
    | 'timer_tick'
    | 'timer_paused'
    | 'timer_resumed'
    | 'time_up'
    | 'answer_received'
    | 'answer_evaluated'
    | 'game_finished'
    | 'results_published'
    | 'error';
  payload: any;
}
