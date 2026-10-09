// AI Voice Host Manager for Zakovat questions
// Supports Gemini 3.8 Flash Lite TTS with fallback to Web Speech Synthesis API

type StateListener = (isSpeaking: boolean) => void;

class AIVoiceAnnouncer {
  private currentAudio: HTMLAudioElement | null = null;
  private isSpeakingState: boolean = false;
  private autoSpeak: boolean = true;
  private voiceName: string = 'Puck'; // Puck: youthful, fluent boy voice
  private listeners: Set<StateListener> = new Set();

  constructor() {
    const savedAuto = localStorage.getItem('zakovat_ai_voice_auto');
    this.autoSpeak = savedAuto !== 'false'; // default true

    const savedVoice = localStorage.getItem('zakovat_ai_voice_name');
    if (savedVoice) {
      this.voiceName = savedVoice;
    }
  }

  public getVoice(): string {
    return this.voiceName;
  }

  public setVoice(v: string) {
    this.voiceName = v;
    localStorage.setItem('zakovat_ai_voice_name', v);
  }

  public isAutoSpeakEnabled(): boolean {
    return this.autoSpeak;
  }

  public toggleAutoSpeak(): boolean {
    this.autoSpeak = !this.autoSpeak;
    localStorage.setItem('zakovat_ai_voice_auto', String(this.autoSpeak));
    return this.autoSpeak;
  }

  public isSpeaking(): boolean {
    return this.isSpeakingState;
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.isSpeakingState);
    return () => this.listeners.delete(listener);
  }

  private setSpeaking(val: boolean) {
    this.isSpeakingState = val;
    this.listeners.forEach((fn) => {
      try {
        fn(val);
      } catch {}
    });
  }

  public stopSpeaking() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {}
      this.currentAudio = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    this.setSpeaking(false);
  }

  public async speakQuestion(
    questionText: string,
    order?: number,
    options?: { force?: boolean; voice?: string }
  ): Promise<void> {
    if (!options?.force && !this.autoSpeak) {
      return;
    }

    this.stopSpeaking();
    if (!questionText || !questionText.trim()) return;

    this.setSpeaking(true);
    const chosenVoice = options?.voice || this.voiceName || 'Puck';

    try {
      // 1. Try server Gemini TTS first with youthful boy voice
      const res = await fetch('/api/ai/speak-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: questionText.trim(),
          order: order,
          voiceName: chosenVoice,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
          this.currentAudio = audio;

          audio.onended = () => {
            this.setSpeaking(false);
            this.currentAudio = null;
          };

          audio.onerror = () => {
            this.fallbackWebSpeech(questionText, order);
          };

          await audio.play();
          return;
        }
      }
    } catch (e) {
      console.warn('Gemini TTS network issue, falling back to browser speech:', e);
    }

    // 2. Fallback to Web Speech API
    this.fallbackWebSpeech(questionText, order);
  }

  public async speakAnnouncement(
    announcementText: string,
    options?: { force?: boolean; voice?: string }
  ): Promise<void> {
    if (!options?.force && !this.autoSpeak) {
      return;
    }

    this.stopSpeaking();
    if (!announcementText || !announcementText.trim()) return;

    this.setSpeaking(true);
    const chosenVoice = options?.voice || this.voiceName || 'Puck';

    try {
      const res = await fetch('/api/ai/speak-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: announcementText.trim(),
          isAnnouncement: true,
          voiceName: chosenVoice,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
          this.currentAudio = audio;

          audio.onended = () => {
            this.setSpeaking(false);
            this.currentAudio = null;
          };

          audio.onerror = () => {
            this.fallbackWebSpeechPlain(announcementText);
          };

          await audio.play();
          return;
        }
      }
    } catch (e) {
      console.warn('Gemini announcement TTS failed, using fallback speech:', e);
    }

    this.fallbackWebSpeechPlain(announcementText);
  }

  private fallbackWebSpeechPlain(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.setSpeaking(false);
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.lang = 'uz-UZ';
      utterance.rate = 1.0;
      utterance.pitch = 1.15; // Youthful boy pitch

      const voices = window.speechSynthesis.getVoices();
      const maleVoice = voices.find(
        (v) =>
          (v.lang.startsWith('uz') || v.lang.startsWith('tr') || v.lang.startsWith('ru') || v.lang.startsWith('en')) &&
          (v.name.toLowerCase().includes('male') ||
            v.name.toLowerCase().includes('boy') ||
            v.name.toLowerCase().includes('david') ||
            v.name.toLowerCase().includes('guy'))
      ) || voices.find((v) => v.lang.startsWith('uz') || v.lang.startsWith('tr'));

      if (maleVoice) utterance.voice = maleVoice;

      utterance.onend = () => this.setSpeaking(false);
      utterance.onerror = () => this.setSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch {
      this.setSpeaking(false);
    }
  }

  private fallbackWebSpeech(text: string, order?: number) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.setSpeaking(false);
      return;
    }

    try {
      const ordinalWords: Record<number, string> = {
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
      };

      const orderWord = order && ordinalWords[order] ? ordinalWords[order] : (order ? `${order}-` : '');
      const clean = text.replace(/^(diqqat,?\s*savol:?\s*)/i, '').trim();
      const speechText = orderWord
        ? `Diqqat, ${orderWord} savol. ${clean}. Vaqt ketdi!`
        : `Diqqat, savol. ${clean}. Vaqt ketdi!`;

      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.lang = 'uz-UZ';
      utterance.rate = 0.98; // natural, fluent pacing
      utterance.pitch = 1.15; // youthful boy pitch

      // Try selecting a male / youthful voice
      const voices = window.speechSynthesis.getVoices();
      const maleVoice = voices.find(
        (v) =>
          (v.lang.startsWith('uz') || v.lang.startsWith('tr') || v.lang.startsWith('ru') || v.lang.startsWith('en')) &&
          (v.name.toLowerCase().includes('male') ||
            v.name.toLowerCase().includes('boy') ||
            v.name.toLowerCase().includes('david') ||
            v.name.toLowerCase().includes('guy'))
      ) || voices.find((v) => v.lang.startsWith('uz') || v.lang.startsWith('tr'));

      if (maleVoice) utterance.voice = maleVoice;

      utterance.onend = () => {
        this.setSpeaking(false);
      };

      utterance.onerror = () => {
        this.setSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      this.setSpeaking(false);
    }
  }
}

export const aiVoice = new AIVoiceAnnouncer();
