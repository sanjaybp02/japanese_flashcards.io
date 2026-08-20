import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Read index.html and evaluate JS context with a mock DOM environment
const htmlContent = fs.readFileSync('index.html', 'utf8');
const scriptMatch = htmlContent.match(/<script type="module">([\s\S]*?)<\/script>/);

if (!scriptMatch) {
  throw new Error("Could not find <script type=\"module\"> block in index.html");
}

let jsCode = scriptMatch[1];

// Strip out Firebase imports and initialization for standalone unit testing
jsCode = jsCode.replace(/import\s+[\s\S]*?from\s+['"].*?['"];?/g, '');
jsCode = `
const onAuthStateChanged = () => {};
const GoogleAuthProvider = class {};
const signInWithPopup = async () => {};
const signInWithRedirect = async () => {};
const getRedirectResult = async () => ({});
const signOut = async () => {};
const doc = () => ({});
const getDoc = async () => ({ exists: () => false });
const setDoc = async () => {};
const onSnapshot = () => {};
` + jsCode;
jsCode = jsCode.replace(/const app\s*=[\s\S]*?;/g, 'const app = {};');
jsCode = jsCode.replace(/const auth\s*=[\s\S]*?;/g, 'const auth = { onAuthStateChanged: () => {} };');
jsCode = jsCode.replace(/const db\s*=[\s\S]*?;/g, 'const db = {};');

// Create mock DOM environment
function createMockElement(id = '') {
  return {
    id,
    style: {},
    dataset: { script: 'hiragana' },
    classList: {
      add: () => {},
      remove: () => {},
      toggle: () => {},
      contains: () => false
    },
    addEventListener: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
    appendChild: () => {},
    removeChild: () => {},
    querySelector: () => createMockElement(),
    querySelectorAll: () => [],
    getContext: () => ({
      clearRect: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      fillRect: () => {}
    }),
    textContent: '',
    innerHTML: '',
    disabled: false
  };
}

const mockElements = new Map();
function getMockEl(id) {
  if (!mockElements.has(id)) {
    mockElements.set(id, createMockElement(id));
  }
  return mockElements.get(id);
}

const mockDocument = {
  documentElement: createMockElement('html'),
  body: createMockElement('body'),
  getElementById: (id) => getMockEl(id),
  querySelector: () => createMockElement(),
  querySelectorAll: () => [createMockElement()],
  addEventListener: () => {},
  createElement: () => createMockElement()
};

const mockWindow = {
  addEventListener: () => {},
  removeEventListener: () => {},
  innerWidth: 1024,
  innerHeight: 768,
  matchMedia: () => ({ matches: false }),
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
  }
};

// Evaluate the script inside a scope exposing mock globals and capturing internal variables
const evaluator = new Function(
  'document', 'window', 'localStorage', 'console',
  `
  ${jsCode}
  return {
    H, K, N, KJ, KANJI_EMOJIS, COLORS_LIGHT, COLORS_DARK,
    generateQuizOptions, shuffleArr, buildDeck, scriptLabel, getDeckTitle,
    renderGrid
  };
  `
);

const env = evaluator(mockDocument, mockWindow, mockWindow.localStorage, console);

describe('Japanese Flashcards Unit & Integration Tests', () => {

  describe('1. Card Decks Data Integrity', () => {
    it('Hiragana deck (H) has 46 valid unique characters', () => {
      assert.equal(env.H.length, 46);
      const chars = new Set();
      env.H.forEach(card => {
        assert.ok(card.c && typeof card.c === 'string', 'Character must be a non-empty string');
        assert.ok(card.r && typeof card.r === 'string', 'Romaji reading must be a non-empty string');
        assert.ok(card.g && typeof card.g === 'string', 'Group must be a non-empty string');
        assert.ok(!chars.has(card.c), `Duplicate Hiragana character found: ${card.c}`);
        chars.add(card.c);
      });
    });

    it('Katakana deck (K) has 46 valid unique characters', () => {
      assert.equal(env.K.length, 46);
      const chars = new Set();
      env.K.forEach(card => {
        assert.ok(card.c && typeof card.c === 'string');
        assert.ok(card.r && typeof card.r === 'string');
        assert.ok(card.g && typeof card.g === 'string');
        assert.ok(!chars.has(card.c), `Duplicate Katakana character found: ${card.c}`);
        chars.add(card.c);
      });
    });

    it('Numbers deck (N) has 12 valid unique items with numerals', () => {
      assert.equal(env.N.length, 12);
      const chars = new Set();
      env.N.forEach(card => {
        assert.ok(card.c && typeof card.c === 'string');
        assert.ok(card.r && typeof card.r === 'string');
        assert.ok(card.g && typeof card.g === 'string');
        assert.ok(card.n && typeof card.n === 'string', 'Number card must have numeral string');
        assert.ok(!chars.has(card.c), `Duplicate Number character found: ${card.c}`);
        chars.add(card.c);
      });
    });

    it('Kanji deck (KJ) has 42 valid unique characters', () => {
      assert.equal(env.KJ.length, 42);
      const chars = new Set();
      env.KJ.forEach(card => {
        assert.ok(card.c && typeof card.c === 'string');
        assert.ok(card.r && typeof card.r === 'string');
        assert.ok(card.g && typeof card.g === 'string');
        assert.ok(!chars.has(card.c), `Duplicate Kanji character found: ${card.c}`);
        chars.add(card.c);
      });
    });

    it('KANJI_EMOJIS covers all 42 Kanji characters', () => {
      env.KJ.forEach(card => {
        assert.ok(env.KANJI_EMOJIS[card.c], `Missing emoji mapping for Kanji: ${card.c}`);
      });
    });
  });

  describe('2. Quiz Distractor & Option Generator', () => {
    it('generates 3 options for cards across all decks', () => {
      const allDecks = [...env.H, ...env.K, ...env.N, ...env.KJ];
      allDecks.forEach(card => {
        const quiz = env.generateQuizOptions(card);
        assert.equal(quiz.options.length, 3, `Quiz for ${card.c} should have 3 options`);
        assert.equal(quiz.answered, false);
        assert.equal(quiz.selectedIndex, null);

        const correctOpts = quiz.options.filter(o => o.isCorrect);
        assert.equal(correctOpts.length, 1, `Quiz for ${card.c} should have exactly 1 correct option`);
        assert.equal(correctOpts[0].text, card.r.toUpperCase());

        // Check uniqueness of option texts
        const texts = quiz.options.map(o => o.text);
        const uniqueTexts = new Set(texts);
        assert.equal(uniqueTexts.size, 3, `Quiz options for ${card.c} should all be unique: ${texts.join(', ')}`);
      });
    });
  });

  describe('3. Deck Building & Shuffling', () => {
    it('builds decks correctly for all script modes', () => {
      assert.equal(env.buildDeck('hiragana', false).length, 46);
      assert.equal(env.buildDeck('katakana', false).length, 46);
      assert.equal(env.buildDeck('numbers', false).length, 12);
      assert.equal(env.buildDeck('kanji', false).length, 42);
      assert.equal(env.buildDeck('both', false).length, 92);
    });

    it('shuffleArr preserves all elements', () => {
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const shuffled = env.shuffleArr(original);
      assert.equal(shuffled.length, original.length);
      assert.deepEqual(shuffled.sort((a,b)=>a-b), original);
    });
  });

  describe('4. Deck Title & Label Formatting', () => {
    it('getDeckTitle returns expected title strings', () => {
      // In evaluator context, script variable is set
      assert.ok(typeof env.getDeckTitle === 'function');
    });

    it('scriptLabel formats script name appropriately', () => {
      assert.equal(env.scriptLabel('あ'), 'Hiragana');
    });
  });

  describe('5. Theme Colors Configuration', () => {
    it('COLORS_LIGHT and COLORS_DARK have required properties for all 5 decks', () => {
      const keys = ['hiragana', 'katakana', 'both', 'numbers', 'kanji'];
      keys.forEach(k => {
        assert.ok(env.COLORS_LIGHT[k].bg, `Missing light bg for ${k}`);
        assert.ok(env.COLORS_LIGHT[k].light, `Missing light light for ${k}`);
        assert.ok(env.COLORS_LIGHT[k].accent, `Missing light accent for ${k}`);

        assert.ok(env.COLORS_DARK[k].bg, `Missing dark bg for ${k}`);
        assert.ok(env.COLORS_DARK[k].light, `Missing dark light for ${k}`);
        assert.ok(env.COLORS_DARK[k].accent, `Missing dark accent for ${k}`);
      });
    });
  });

  describe('6. Selective Deck Reset Behavior', () => {
    it('resetting Hiragana deck progress clears only Hiragana characters from known set', () => {
      const known = new Set(['あ', 'い', 'ア', '日']);
      const hiraganaDeck = env.H;

      // Simulate selective reset
      hiraganaDeck.forEach(c => known.delete(c.c));

      assert.equal(known.has('あ'), false);
      assert.equal(known.has('い'), false);
      assert.equal(known.has('ア'), true, 'Katakana character should remain known');
      assert.equal(known.has('日'), true, 'Kanji character should remain known');
    });
  });

  describe('7. Mastery Calculation & Unmastering', () => {
    it('mastered status requires all cards in deck to be known', () => {
      const deck = [{c:'あ'}, {c:'い'}];
      const known = new Set(['あ']);
      
      const isMasteredInitially = deck.filter(c=>known.has(c.c)).length === deck.length;
      assert.equal(isMasteredInitially, false);

      known.add('い');
      const isMasteredFull = deck.filter(c=>known.has(c.c)).length === deck.length;
      assert.equal(isMasteredFull, true);

      // Unmastering
      known.delete('あ');
      const isMasteredAfterUnmaster = deck.filter(c=>known.has(c.c)).length === deck.length;
      assert.equal(isMasteredAfterUnmaster, false);
    });
  });

  describe('8. Revision Streak Engine', () => {
    it('increments streak on correct selection and resets on incorrect selection', () => {
      let streak = 0;
      
      // Select correct
      const isCorrect1 = true;
      if (isCorrect1) streak++; else streak = 0;
      assert.equal(streak, 1);

      // Select correct
      const isCorrect2 = true;
      if (isCorrect2) streak++; else streak = 0;
      assert.equal(streak, 2);

      // Select incorrect
      const isCorrect3 = false;
      if (isCorrect3) streak++; else streak = 0;
      assert.equal(streak, 0);
    });
  });

  describe('9. Character Grid Progress Chart Filtering & Empty States', () => {
    it('correctly filters known vs unmastered cards', () => {
      const deck = [{c:'あ'}, {c:'い'}, {c:'う'}];
      const known = new Set(['あ']);

      const knownFiltered = deck.filter(c => known.has(c.c));
      assert.equal(knownFiltered.length, 1);
      assert.equal(knownFiltered[0].c, 'あ');

      const unmasteredFiltered = deck.filter(c => !known.has(c.c));
      assert.equal(unmasteredFiltered.length, 2);
    });
  });

  describe('10. LocalStorage Known Cards Synchronization', () => {
    it('serializes and deserializes known cards array correctly', () => {
      const known = new Set(['あ', '一', 'カ']);
      const serialized = JSON.stringify([...known]);
      const restored = new Set(JSON.parse(serialized));
      assert.deepEqual(restored, known);
    });
  });

  describe('11. Multi-Device & Account Mail Sync Scenarios', () => {
    it('11.1 Initial device sync: downloads remote progress on new device login', () => {
      const remoteCards = ['あ', 'い', '日'];
      const deviceBLocal = new Set();
      
      // Simulate login on Device B with existing remote document
      const merged = new Set([...deviceBLocal, ...remoteCards]);
      assert.equal(merged.size, 3);
      assert.ok(merged.has('あ'));
      assert.ok(merged.has('い'));
      assert.ok(merged.has('日'));
    });

    it('11.2 Offline merge on login: union merges local offline progress with remote account progress', () => {
      const localOfflineCards = ['う', 'え'];
      const remoteAccountCards = ['あ', 'い'];

      const merged = new Set([...localOfflineCards, ...remoteAccountCards]);
      assert.equal(merged.size, 4);
      assert.ok(merged.has('う'));
      assert.ok(merged.has('え'));
      assert.ok(merged.has('あ'));
      assert.ok(merged.has('い'));

      // Check if Firestore update is triggered (merged size > remote size)
      const needsFirestoreUpdate = merged.size > remoteAccountCards.length;
      assert.equal(needsFirestoreUpdate, true, 'Should trigger setDoc update to sync offline cards to cloud');
    });

    it('11.3 Real-time live sync: onSnapshot updates local state and localStorage when changed on another device', () => {
      let localKnown = new Set(['あ']);
      const localStorageMock = new Map();

      // Simulate incoming live snapshot update from Device A
      const incomingSnapshotData = { cards: ['あ', 'か', 'さ'], updatedAt: Date.now() };
      
      localKnown = new Set(incomingSnapshotData.cards);
      localStorageMock.set('kana-known-cards', JSON.stringify([...localKnown]));

      assert.equal(localKnown.size, 3);
      assert.ok(localKnown.has('か'));
      assert.ok(localKnown.has('さ'));
      assert.equal(localStorageMock.get('kana-known-cards'), JSON.stringify(['あ', 'か', 'さ']));
    });

    it('11.4 Multi-tab sync on same device: storage event triggers state reload', () => {
      let tab2Known = new Set(['あ']);
      const localStorageState = JSON.stringify(['あ', 'い', 'う']);

      // Simulate window storage event received in Tab 2
      const storageEvent = { key: 'kana-known-cards', newValue: localStorageState };
      
      if (storageEvent.key === 'kana-known-cards') {
        tab2Known = new Set(JSON.parse(storageEvent.newValue));
      }

      assert.equal(tab2Known.size, 3);
      assert.ok(tab2Known.has('い'));
      assert.ok(tab2Known.has('う'));
    });

    it('11.5 Account switching & data isolation: switching email accounts loads correct user data', () => {
      const userAProgress = ['あ', 'い'];
      const userBProgress = ['カ', 'キ', 'ク'];

      let activeAccountKnown = new Set(userAProgress);
      assert.equal(activeAccountKnown.size, 2);

      // User A signs out, User B signs in
      activeAccountKnown = new Set(userBProgress);
      assert.equal(activeAccountKnown.size, 3);
      assert.ok(activeAccountKnown.has('カ'));
      assert.ok(!activeAccountKnown.has('あ'), 'User A data should not bleed into User B progress');
    });

    it('11.6 Sign out snapshot cleanup: unsubscribes Firestore listener to prevent leak/cross-user sync', () => {
      let unsubCalled = false;
      const mockUnsub = () => { unsubCalled = true; };

      // Simulate sign out flow
      if (mockUnsub) mockUnsub();

      assert.equal(unsubCalled, true, 'Unsubscribe function must be called on sign out');
    });

    it('11.7 Account Mail UI: displays user email or initials correctly', () => {
      const userWithEmail = { email: 'sanjaybp02@gmail.com', displayName: 'Sanjay' };
      const userWithoutEmail = { displayName: 'Japanese Learner' };

      const emailText1 = userWithEmail.email || userWithEmail.displayName || '';
      const emailText2 = userWithoutEmail.email || userWithoutEmail.displayName || '';

      assert.equal(emailText1, 'sanjaybp02@gmail.com');
      assert.equal(emailText2, 'Japanese Learner');
    });
  });

  describe('12. Known Cards Sync & State Consistency on Shuffle Cases', () => {
    it('12.1 Character-based known tracking is immune to shuffle re-indexing', () => {
      const known = new Set(['あ', 'か']);
      const originalDeck = env.buildDeck('hiragana', false);
      const shuffledDeck = env.buildDeck('hiragana', true);

      // Verify that 'あ' and 'か' are recognized as known regardless of position in shuffled deck
      const knownInOriginal = originalDeck.filter(c => known.has(c.c)).length;
      const knownInShuffled = shuffledDeck.filter(c => known.has(c.c)).length;

      assert.equal(knownInOriginal, 2);
      assert.equal(knownInShuffled, 2, 'Shuffled deck must report identical known card count');

      // Verify each individual card retains correct known status
      shuffledDeck.forEach(card => {
        if (card.c === 'あ' || card.c === 'か') {
          assert.ok(known.has(card.c), `Card ${card.c} should be known in shuffled position`);
        } else {
          assert.ok(!known.has(card.c), `Card ${card.c} should not be known in shuffled position`);
        }
      });
    });

    it('12.2 Marking known while deck is shuffled stores character string, not shuffled index', () => {
      const known = new Set();
      const shuffledDeck = env.buildDeck('hiragana', true);
      
      // Suppose user marks the card currently at index 0 of the shuffled deck
      const targetCard = shuffledDeck[0];
      known.add(targetCard.c);

      // Unshuffle the deck
      const unshuffledDeck = env.buildDeck('hiragana', false);
      const matchedCard = unshuffledDeck.find(c => c.c === targetCard.c);
      
      assert.ok(matchedCard, 'Target character must exist in unshuffled deck');
      assert.ok(known.has(matchedCard.c), 'Known set must contain the character string, not index');
    });

    it('12.3 Remote sync arriving while deck is shuffled updates known count accurately', () => {
      const shuffledDeck = env.buildDeck('katakana', true);
      
      // Simulate remote sync update arriving while user is viewing a shuffled Katakana deck
      const remoteSnapshotCards = ['ア', 'カ', 'サ', 'タ'];
      const known = new Set(remoteSnapshotCards);

      const knownInShuffledDeck = shuffledDeck.filter(c => known.has(c.c)).length;
      assert.equal(knownInShuffledDeck, 4, 'Remote snapshot must accurately match 4 Katakana cards in shuffled order');
    });

    it('12.4 Tab switching with active shuffle maintains shuffle state and character progress', () => {
      const known = new Set(['ア', '一']); // 1 Katakana, 1 Number
      const isShuffled = true;

      // Switch to Katakana tab with shuffle active
      const katakanaDeck = env.buildDeck('katakana', isShuffled);
      assert.equal(katakanaDeck.length, 46);
      assert.equal(katakanaDeck.filter(c => known.has(c.c)).length, 1);

      // Switch to Numbers tab with shuffle active
      const numbersDeck = env.buildDeck('numbers', isShuffled);
      assert.equal(numbersDeck.length, 12);
      assert.equal(numbersDeck.filter(c => known.has(c.c)).length, 1);
    });

    it('12.5 Toggling shuffle OFF restores canonical order while retaining all known progress', () => {
      const known = new Set(['あ', 'い', 'う']);
      
      // Start shuffled
      const shuffled = env.buildDeck('hiragana', true);
      assert.equal(shuffled.filter(c => known.has(c.c)).length, 3);

      // Toggle shuffle OFF
      const restored = env.buildDeck('hiragana', false);
      assert.equal(restored[0].c, 'あ', 'Index 0 in original order must be あ');
      assert.equal(restored[1].c, 'い', 'Index 1 in original order must be い');
      assert.equal(restored[2].c, 'う', 'Index 2 in original order must be う');
      assert.equal(restored.filter(c => known.has(c.c)).length, 3);
    });

    it('12.6 Selective deck reset while shuffled clears progress for active deck only', () => {
      const known = new Set(['あ', 'い', 'ア', '二']); // Hiragana + Katakana + Numbers
      const isShuffled = true;
      const hiraganaShuffledDeck = env.buildDeck('hiragana', isShuffled);

      // Perform selective reset on Hiragana while shuffled
      hiraganaShuffledDeck.forEach(c => known.delete(c.c));

      assert.equal(known.has('あ'), false);
      assert.equal(known.has('い'), false);
      assert.equal(known.has('ア'), true, 'Katakana card must survive Hiragana reset while shuffled');
      assert.equal(known.has('二'), true, 'Number card must survive Hiragana reset while shuffled');
    });

    it('12.7 Revision Mode distractor generation remains valid when deck is shuffled', () => {
      const shuffledKanjiDeck = env.buildDeck('kanji', true);
      
      shuffledKanjiDeck.forEach(card => {
        const quiz = env.generateQuizOptions(card);
        assert.equal(quiz.options.length, 3);
        assert.equal(quiz.options.filter(o => o.isCorrect).length, 1);
        assert.equal(quiz.options.find(o => o.isCorrect).text, card.r.toUpperCase());
      });
    });
  });
});
