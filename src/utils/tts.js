// Text-to-Speech engine using the browser's built-in Web Speech API
// Zero cost, zero API keys, works offline

class TTSEngine {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voice = null;
    this.rate = 1.0;
    this.pitch = 1.0;
    this.volume = 1.0;
    this.speaking = false;
    this.onWordCallback = null;
    this.onEndCallback = null;
    this._currentUtterance = null;
  }

  getVoices() {
    return this.synth.getVoices().filter(v => v.lang.startsWith('en'));
  }

  getAllVoices() {
    return this.synth.getVoices();
  }

  setVoice(voice) {
    this.voice = voice;
  }

  setRate(rate) {
    this.rate = Math.max(0.5, Math.min(3.0, rate));
  }

  setPitch(pitch) {
    this.pitch = Math.max(0.5, Math.min(2.0, pitch));
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  // Speak a chunk of text (sentence or paragraph)
  // onBoundary fires with word index offsets for tracking
  speak(text, { onBoundary, onEnd } = {}) {
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.voice) utterance.voice = this.voice;
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;
    utterance.volume = this.volume;

    if (onBoundary) {
      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          // charIndex tells us where in the text string we are
          // We convert that to a word index
          const spokenSoFar = text.slice(0, event.charIndex);
          const wordIdx = spokenSoFar.split(/\s+/).filter(w => w).length;
          onBoundary(wordIdx);
        }
      };
    }

    utterance.onend = () => {
      this.speaking = false;
      this._currentUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      // 'interrupted' and 'canceled' are expected when we call stop()
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('TTS error:', e.error);
      }
      this.speaking = false;
      this._currentUtterance = null;
    };

    this._currentUtterance = utterance;
    this.speaking = true;
    this.synth.speak(utterance);
  }

  stop() {
    this.synth.cancel();
    this.speaking = false;
    this._currentUtterance = null;
  }

  pause() {
    this.synth.pause();
  }

  resume() {
    this.synth.resume();
  }

  get isPaused() {
    return this.synth.paused;
  }

  get isSpeaking() {
    return this.synth.speaking;
  }
}

// Singleton
let _instance = null;

export function getTTSEngine() {
  if (!_instance) {
    _instance = new TTSEngine();
  }
  return _instance;
}

// Build sentences from a word array with their start indices
export function buildSentences(words) {
  const sentences = [];
  let current = [];
  let startIdx = 0;

  words.forEach((w, i) => {
    if (current.length === 0) startIdx = i;
    current.push(w.text);

    const lastChar = w.text[w.text.length - 1];
    const isSentenceEnd = '.!?'.includes(lastChar);
    const isLongEnough = current.length >= 20; // break long run-ons

    if (isSentenceEnd || isLongEnough || i === words.length - 1) {
      sentences.push({
        text: current.join(' '),
        startWordIndex: startIdx,
        endWordIndex: i,
        wordCount: current.length,
      });
      current = [];
    }
  });

  return sentences;
}
