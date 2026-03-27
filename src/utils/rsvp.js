// Optimal Recognition Point calculation
export function getORP(word) {
  const clean = word.replace(/[^a-zA-Z]/g, '');
  const len = clean.length;
  if (len <= 1) return 0;
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  if (len <= 9) return 2;
  return 3;
}

// Smart delay: longer pauses at punctuation
export function getWordDelay(word, baseMs) {
  const last = word[word.length - 1];
  if ('.!?'.includes(last)) return baseMs * 2.0;
  if (',;:'.includes(last)) return baseMs * 1.4;
  if ('"\'—)'.includes(last)) return baseMs * 1.2;
  // Longer words get slightly more time
  if (word.length > 10) return baseMs * 1.15;
  return baseMs;
}

export function wpmToMs(wpm) {
  return 60000 / wpm;
}

export function formatTime(totalWords, currentIndex, wpm) {
  const remaining = totalWords - currentIndex;
  const minutes = Math.round(remaining / wpm);
  if (minutes < 1) return 'less than 1 min';
  if (minutes === 1) return '1 min';
  return `${minutes} min`;
}
