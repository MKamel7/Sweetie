// Public settings only. The clues, titles and letters live in secrets/content.json
// (never committed) and ship as time-lock ciphertext in js/sealed.js: run `npm run seal`.
// Every unlock time is an absolute moment in Berlin time (CEST, +02:00 until 25 Oct 2026).

import { localTime } from './timelock.js';

export const BIRTHDAY = {
  date: '2026-09-29', // her birthday (YYYY-MM-DD)
  utcOffset: '+02:00', // Berlin (CEST)
  timeZone: 'Europe/Berlin', // every time shown in the app is Berlin time
};

// Where progress is saved on her phone. Change the "run" to restart everyone from the beginning.
export const STORAGE_KEY = `sweetie:${BIRTHDAY.date}:run2`;

// on('2026-10-02', '14:00') = 2pm Berlin time on that date.
const on = (date, time) => localTime(date, time, BIRTHDAY.utcOffset);
const MEET_DAY = '2026-10-02'; // the day you see her

export const HER = {
  name: 'Tereza',
  nickname: 'Sweetie',
  from: 'Kamel', // how you sign your letters
  age: 27, // shown as number candles on the cake (0 = five plain candles)
};

export const INTRO_LETTER = [
  'Hi Tereza.',
  'I built you a little world for your birthday.',
  'Surprises are hidden along the way, and each one opens at its own time. The first one opens at midnight.',
  'No peeking, no cheating. The cat is watching.',
];

// Only the teaser is public; everything else is sealed until `unlockAt`.
export const GIFTS = [
  {
    id: 'midnight',
    unlockAt: on(BIRTHDAY.date, '00:00'),
    teaser: 'A letter from me. It opens the very second your birthday begins.',
  },
  // ---- 2 October: the day you meet. Four clues, 45 minutes apart. ----
  {
    id: 'papyrus-1',
    unlockAt: on(MEET_DAY, '14:00'),
    teaser: 'Something very, very old is looking for you.',
  },
  {
    id: 'papyrus-2',
    unlockAt: on(MEET_DAY, '14:45'),
    teaser: 'Half a scroll is only half a story.',
  },
  {
    id: 'vinyl',
    unlockAt: on(MEET_DAY, '15:30'),
    teaser: 'Round, black, and it sings.',
  },
  {
    id: 'friend',
    unlockAt: on(MEET_DAY, '16:15'),
    teaser: 'The last surprise. This one has a heartbeat.',
  },
];

// After every gift is opened AND this time has passed, the cake appears.
// Its letter is sealed like the gifts.
export const FINALE = {
  unlockAt: on(MEET_DAY, '16:15'),
};

// Random sassy lines when she taps a locked gift.
export const NO_PEEKING = [
  'No peeking!',
  'The cat says: not yet.',
  'Patience, birthday girl.',
  'Nice try.',
  'Shaking it won’t help. (It might.)',
  'Come back later, I’m still wrapping it.',
];
