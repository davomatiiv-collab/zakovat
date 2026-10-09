// Text-To-Speech (TTS) and Voice Recognition (STT) for Zakovat

class SpeechManager {
  private synth: SpeechSynthesis | null = null;
  private isAutoSpeechEnabled: boolean = true;
  private isSpeaking: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      const saved = localStorage.getItem('zakovat_auto_speech');
      if (saved !== null) {
        this.isAutoSpeechEnabled = saved === 'true';
      }
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public isAutoSpeech(): boolean {
    return this.isAutoSpeechEnabled;
  }

  public setAutoSpeech(enabled: boolean) {
    this.isAutoSpeechEnabled = enabled;
    localStorage.setItem('zakovat_auto_speech', String(enabled));
    if (!enabled) {
      this.stop();
    }
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
      this.currentUtterance = null;
    }
  }

  // Speak question out loud in natural cadence
  public speakQuestion(
    questionText: string,
    questionNumber?: number,
    onEnd?: () => void
  ) {
    if (!this.synth) return;

    this.stop();

    // Format text like a real Zakovat host (Boshlovchi)
    let fullNarration = '';
    if (questionNumber) {
      fullNarration += `Diqqat, ${questionNumber}-savol. `;
    } else {
      fullNarration += `Diqqat, savol. `;
    }
    fullNarration += questionText;

    const utterance = new SpeechSynthesisUtterance(fullNarration);
    this.currentUtterance = utterance;

    // Pick best matching voice
    const voices = this.synth.getVoices();
    // Prefer Uzbek if installed, else Turkish / Russian / English high-quality
    const uzVoice = voices.find((v) => v.lang.startsWith('uz'));
    const trVoice = voices.find((v) => v.lang.startsWith('tr')); // Turkish has very similar phonetic reading to Uzbek Latin!
    const ruVoice = voices.find((v) => v.lang.startsWith('ru'));
    const defVoice = voices.find((v) => v.default) || voices[0];

    if (uzVoice) {
      utterance.voice = uzVoice;
      utterance.lang = uzVoice.lang;
    } else if (trVoice) {
      utterance.voice = trVoice; // Pronounces Uzbek Latin phonetically well
      utterance.lang = trVoice.lang;
    } else if (defVoice) {
      utterance.voice = defVoice;
    }

    utterance.rate = 0.95; // Slightly measured, clear host reading speed
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      this.isSpeaking = true;
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.warn('Speech error:', e);
      this.isSpeaking = false;
      this.currentUtterance = null;
    };

    this.synth.speak(utterance);
  }

  public getSpeakingState(): boolean {
    return this.isSpeaking;
  }
}

export const speech = new SpeechManager();
