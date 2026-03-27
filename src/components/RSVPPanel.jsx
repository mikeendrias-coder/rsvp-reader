import React, { useEffect, useRef, useCallback, useState } from 'react';
import { getORP, getWordDelay, wpmToMs, formatTime } from '../utils/rsvp.js';
import { getTTSEngine, buildSentences } from '../utils/tts.js';

export default function RSVPPanel({
  words,
  currentIndex,
  setCurrentIndex,
  playing,
  setPlaying,
  wpm,
  setWpm,
  chapterIndex,
  totalChapters,
  chapterTitle,
  onNextChapter,
  onPrevChapter,
  onChapterEnd,
}) {
  const intervalRef = useRef(null);
  const indexRef = useRef(currentIndex);
  indexRef.current = currentIndex;

  // TTS state
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsVoices, setTtsVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [ttsRate, setTtsRate] = useState(1.0);
  const [showTtsSettings, setShowTtsSettings] = useState(false);
  const ttsRef = useRef(null);
  const sentencesRef = useRef([]);
  const currentSentenceRef = useRef(0);

  // Load voices
  useEffect(() => {
    const tts = getTTSEngine();
    ttsRef.current = tts;

    const loadVoices = () => {
      const voices = tts.getVoices();
      setTtsVoices(voices);
      if (voices.length > 0 && !selectedVoice) {
        // Prefer a natural/premium voice
        const preferred = voices.find(v =>
          v.name.toLowerCase().includes('samantha') ||
          v.name.toLowerCase().includes('natural') ||
          v.name.toLowerCase().includes('premium')
        ) || voices[0];
        setSelectedVoice(preferred.name);
        tts.setVoice(preferred);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      tts.stop();
    };
  }, []);

  // Update TTS settings when they change
  useEffect(() => {
    const tts = ttsRef.current;
    if (!tts) return;
    tts.setRate(ttsRate);
    const voice = ttsVoices.find(v => v.name === selectedVoice);
    if (voice) tts.setVoice(voice);
  }, [ttsRate, selectedVoice, ttsVoices]);

  // Build sentences when words change
  useEffect(() => {
    sentencesRef.current = buildSentences(words);
    currentSentenceRef.current = 0;
  }, [words]);

  // TTS playback - speak sentence by sentence, synced with word index
  const speakFromIndex = useCallback((startIdx) => {
    const tts = ttsRef.current;
    if (!tts || !ttsEnabled) return;

    const sentences = sentencesRef.current;
    // Find which sentence contains startIdx
    let sentIdx = sentences.findIndex(s => s.startWordIndex <= startIdx && s.endWordIndex >= startIdx);
    if (sentIdx === -1) sentIdx = 0;
    currentSentenceRef.current = sentIdx;

    const speakNext = () => {
      const idx = currentSentenceRef.current;
      if (idx >= sentences.length) return;

      const sentence = sentences[idx];
      tts.speak(sentence.text, {
        onBoundary: (wordOffset) => {
          const globalIdx = sentence.startWordIndex + wordOffset;
          if (globalIdx < words.length) {
            setCurrentIndex(globalIdx);
          }
        },
        onEnd: () => {
          currentSentenceRef.current = idx + 1;
          if (currentSentenceRef.current < sentences.length) {
            speakNext();
          } else {
            onChapterEnd();
          }
        },
      });
    };

    speakNext();
  }, [ttsEnabled, words, setCurrentIndex, onChapterEnd]);

  // Stop TTS when disabled or chapter changes
  useEffect(() => {
    if (!ttsEnabled && ttsRef.current) {
      ttsRef.current.stop();
    }
  }, [ttsEnabled, chapterIndex]);

  const togglePlay = useCallback(() => {
    if (currentIndex >= words.length - 1) {
      setCurrentIndex(0);
    }
    setPlaying(p => !p);
  }, [currentIndex, words.length, setCurrentIndex, setPlaying]);

  // Handle play/pause with TTS
  useEffect(() => {
    if (playing && ttsEnabled) {
      speakFromIndex(indexRef.current);
    } else if (!playing && ttsRef.current) {
      ttsRef.current.stop();
    }
  }, [playing, ttsEnabled]);

  useEffect(() => {
    const handler = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight' && !playing) {
        setCurrentIndex(i => Math.min(i + 1, words.length - 1));
      } else if (e.code === 'ArrowLeft' && !playing) {
        setCurrentIndex(i => Math.max(i - 1, 0));
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setWpm(w => Math.min(w + 25, 1000));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setWpm(w => Math.max(w - 25, 50));
      } else if (e.code === 'BracketRight') {
        onNextChapter();
      } else if (e.code === 'BracketLeft') {
        onPrevChapter();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [playing, togglePlay, setCurrentIndex, setWpm, words.length, onNextChapter, onPrevChapter]);

  // RSVP timer (only when TTS is off - when TTS is on, TTS drives the word index)
  useEffect(() => {
    if (playing && words.length > 0 && !ttsEnabled) {
      const advance = () => {
        const idx = indexRef.current;
        if (idx >= words.length - 1) {
          onChapterEnd();
          return;
        }
        const nextIdx = idx + 1;
        setCurrentIndex(nextIdx);
        const baseMs = wpmToMs(wpm);
        const delay = getWordDelay(words[nextIdx]?.text || '', baseMs);
        intervalRef.current = setTimeout(advance, delay);
      };
      const baseMs = wpmToMs(wpm);
      const delay = getWordDelay(words[currentIndex]?.text || '', baseMs);
      intervalRef.current = setTimeout(advance, delay);
    }
    return () => clearTimeout(intervalRef.current);
  }, [playing, wpm, ttsEnabled]);

  const word = words[currentIndex]?.text || '';
  const orp = getORP(word);
  const before = word.slice(0, orp);
  const focus = word[orp] || '';
  const after = word.slice(orp + 1);
  const progress = words.length > 0 ? (currentIndex / (words.length - 1)) * 100 : 0;
  const timeLeft = ttsEnabled ? '' : formatTime(words.length, currentIndex, wpm);

  const btnStyle = (disabled) => ({
    background: 'none',
    border: '1px solid #444',
    borderRadius: 'var(--radius-sm)',
    padding: '4px 10px',
    fontSize: 12,
    color: disabled ? '#333' : '#999',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
  });

  return (
    <div style={{
      background: 'var(--bg-rsvp)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px 24px',
      position: 'relative',
      minHeight: 150,
      gap: 6,
    }}>
      {/* Progress bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        background: 'rgba(255,255,255,0.06)',
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'var(--accent)',
          transition: 'width 0.1s linear',
        }} />
      </div>

      {/* Chapter nav + title */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 11,
        color: '#666',
        fontFamily: 'var(--font-ui)',
      }}>
        <button
          onClick={onPrevChapter}
          disabled={chapterIndex <= 0}
          style={btnStyle(chapterIndex <= 0)}
        >
          ‹ Prev
        </button>
        <span style={{
          maxWidth: 250,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: '#888',
        }}>
          {chapterTitle}
        </span>
        <button
          onClick={onNextChapter}
          disabled={chapterIndex >= totalChapters - 1}
          style={btnStyle(chapterIndex >= totalChapters - 1)}
        >
          Next ›
        </button>
      </div>

      {/* Word display */}
      <div style={{
        fontFamily: 'var(--font-body)',
        fontSize: 44,
        fontWeight: 400,
        letterSpacing: '0.02em',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 66,
        userSelect: 'none',
      }}>
        {word ? (
          <>
            <span style={{ color: '#8a8a8a' }}>{before}</span>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{focus}</span>
            <span style={{ color: '#8a8a8a' }}>{after}</span>
          </>
        ) : (
          <span style={{ color: '#555', fontSize: 16, fontFamily: 'var(--font-ui)' }}>
            Load a book to begin
          </span>
        )}
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        <button
          onClick={togglePlay}
          disabled={words.length === 0}
          style={{
            background: playing ? '#333' : 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 18px',
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: '0.03em',
            opacity: words.length === 0 ? 0.3 : 1,
          }}
        >
          {playing ? 'Pause' : 'Play'}
        </button>

        {/* RSVP speed (hidden when TTS drives playback) */}
        {!ttsEnabled && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="range"
              min={50}
              max={800}
              step={25}
              value={wpm}
              onChange={(e) => setWpm(Number(e.target.value))}
              style={{ width: 100 }}
            />
            <span style={{
              fontSize: 11,
              color: '#777',
              fontFamily: 'var(--font-mono)',
              minWidth: 60,
            }}>
              {wpm} wpm
            </span>
          </div>
        )}

        {/* Read Aloud toggle */}
        <button
          onClick={() => {
            if (ttsEnabled && ttsRef.current) ttsRef.current.stop();
            setTtsEnabled(e => !e);
          }}
          style={{
            background: ttsEnabled ? 'var(--accent)' : 'none',
            color: ttsEnabled ? '#fff' : '#999',
            border: ttsEnabled ? 'none' : '1px solid #444',
            borderRadius: 'var(--radius-sm)',
            padding: '5px 12px',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {ttsEnabled ? '🔊 Reading Aloud' : '🔇 Read Aloud'}
        </button>

        {/* TTS settings gear */}
        {ttsEnabled && (
          <button
            onClick={() => setShowTtsSettings(s => !s)}
            style={{
              background: 'none',
              border: '1px solid #444',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 8px',
              fontSize: 12,
              color: '#999',
            }}
          >
            Voice ⚙
          </button>
        )}

        {timeLeft && words.length > 0 && (
          <span style={{
            fontSize: 11,
            color: '#555',
            fontFamily: 'var(--font-mono)',
          }}>
            {timeLeft} left
          </span>
        )}
      </div>

      {/* TTS settings dropdown */}
      {showTtsSettings && ttsEnabled && (
        <div style={{
          background: '#222',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          width: 340,
          border: '1px solid #333',
        }}>
          {/* Voice selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{
              fontSize: 11,
              color: '#888',
              fontFamily: 'var(--font-mono)',
              minWidth: 40,
            }}>
              Voice
            </label>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              style={{
                flex: 1,
                background: '#333',
                color: '#ccc',
                border: '1px solid #444',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 8px',
                fontSize: 12,
                fontFamily: 'var(--font-ui)',
              }}
            >
              {ttsVoices.map(v => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          {/* Speed */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{
              fontSize: 11,
              color: '#888',
              fontFamily: 'var(--font-mono)',
              minWidth: 40,
            }}>
              Speed
            </label>
            <input
              type="range"
              min={0.5}
              max={2.5}
              step={0.1}
              value={ttsRate}
              onChange={(e) => setTtsRate(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{
              fontSize: 11,
              color: '#777',
              fontFamily: 'var(--font-mono)',
              minWidth: 35,
            }}>
              {ttsRate.toFixed(1)}x
            </span>
          </div>
        </div>
      )}

      {/* Keyboard hints */}
      <div style={{
        fontSize: 10,
        color: '#444',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.02em',
      }}>
        space: play/pause · arrows: navigate · up/down: speed · [ ] chapters
      </div>
    </div>
  );
}
