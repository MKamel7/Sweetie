// Hand-drawn pixel sprites in the palette of the pixel cat.
// Each sprite is a grid of palette letters; '.' is transparent.

export const PALETTE = {
  k: '#362e2c', // cat ink
  K: '#1b1716',
  r: '#d76159', // coral
  R: '#ca3935', // heart red
  b: '#a4433f', // brick
  p: '#f5d8b9', // peach paper
  c: '#e4d1b9', // cream
  w: '#faf4e9', // paper white
  l: '#e6c0cb', // blush
  o: '#d2999a', // rose
  m: '#cd90ab', // mauve
  g: '#aed1a2', // mint
  G: '#79a86f',
  y: '#f0c35a', // gold
  Y: '#c98f35',
  n: '#9a6546', // wood
  N: '#6b4330',
  S: '#3f6aa0', // lapis
  e: '#b8aaa5', // grey
  E: '#7d706c',
};

export const SPRITES = {
  letter: [
    '................',
    '................',
    '.rrrrrrrrrrrrrr.',
    '.rlpppppppppplr.',
    '.rplpppppppplpr.',
    '.rpplpppppplppr.',
    '.rppplpppplpppr.',
    '.rpppRRppRRpppr.',
    '.rppRwRRRRRRppr.',
    '.rpppRRRRRRpppr.',
    '.rppppRRRRppppr.',
    '.rpppppRRpppppr.',
    '.rppppppppppppr.',
    '.rrrrrrrrrrrrrr.',
    '................',
    '................',
  ],
  friends: [
    '................',
    '................',
    '...kkk....nnn...',
    '..kkkkk..nnnnn..',
    '..kpppk..npppn..',
    '..pkpkp..pkpkp..',
    '..lpppl..lpppl..',
    '...ppp....ppp...',
    '..rrrrr..ggggg..',
    '.prrrrrppgggggp.',
    '..rrrrr..ggggg..',
    '.rrrrrrrggggggg.',
    '..p..p....p..p..',
    '..k..k....k..k..',
    '................',
    '................',
  ],
  scroll: [
    '................',
    '................',
    '.nn..........nn.',
    '.NnppppppppppnN.',
    '.NnpbbppkppppnN.',
    '.NnpbpppkkpbpnN.',
    '.NnppppppppppnN.',
    '.NnppkpbbppkpnN.',
    '.NnpkkppbppppnN.',
    '.NnppppppppppnN.',
    '.NnpbppkkpbbpnN.',
    '.NnpbbpppkpppnN.',
    '.NnppppppppppnN.',
    '.nn..........nn.',
    '................',
    '................',
  ],
  pyramid: [
    '................',
    '...........rr...',
    '..........rrrr..',
    '..........rrrr..',
    '...........rr...',
    '.......Yy.......',
    '......YYyy......',
    '.....YYYyyy.....',
    '....YYYYyyyy....',
    '...YYYYYyyyyy...',
    '..YYYYYYyyyyyy..',
    '.YYYYYYYyyyyyyy.',
    'YYYYYYYYyyyyyyyy',
    'pppppppppppppppp',
    '................',
    '................',
  ],
  heartsparkle: [
    '..y.............',
    '.yyy........y...',
    '..y........yyy..',
    '............y...',
    '....RRR..RRR....',
    '...RRwRRRRRRR...',
    '...RwRRRRRRRR...',
    '...RRRRRRRRRR...',
    '....RRRRRRRR....',
    '.....RRRRRR.....',
    '......RRRR......',
    '.......RR.......',
    '.............y..',
    '............yyy.',
    '.............y..',
    '................',
  ],
  bastet: [
    '.....k....k.....',
    '.....kk..kk.....',
    '.....kYkkYk.....',
    '.....kkkkkky....',
    '.....kykkyk.....',
    '.....kkookk.....',
    '......kkkk......',
    '.....ySyySy.....',
    '......kyyk......',
    '......kkkk......',
    '.....kkkkkk.....',
    '.....kkkkkk..k..',
    '....kkkkkkkk.k..',
    '....kkEkkEkkkk..',
    '..yyyyyyyyyyyy..',
    '..YYYYYYYYYYYY..',
  ],
  vinyl: [
    '................',
    '.....kkkkkk.....',
    '...kkkkkkkkkk...',
    '..kkkEEkkkkkkk..',
    '..kkEkkkkkkkkk..',
    '.kkEkkkkkkkkkkk.',
    '.kkkkkRRRRkkkkk.',
    '.kkkkkRKKRkkkkk.',
    '.kkkkkRKKRkkkkk.',
    '.kkkkkRRRRkkkEk.',
    '.kkkkkkkkkkkEkk.',
    '..kkkkkkkkkEkk..',
    '..kkkkkkkkkkkk..',
    '...kkkkkkkkkk...',
    '.....kkkkkk.....',
    '................',
  ],
  cake: [
    '................',
    '................',
    '...y..y..y..y...',
    '...r..r..r..r...',
    '...w..l..w..l...',
    '...w..l..w..l...',
    '..wwwwwwwwwwww..',
    '..wwowwwwowwww..',
    '..oooooooooooo..',
    '..oRooooRooooR..',
    '..oooooooooooo..',
    '..mmmmmmmmmmmm..',
    '..oooooooooooo..',
    '.eeeeeeeeeeeeee.',
    '................',
    '................',
  ],
  sun: [
    '................',
    '.......yy.......',
    '..y....yy....y..',
    '...y........y...',
    '......yyyy......',
    '.....yyyyyy.....',
    '....yyyyyyyy....',
    '.yy.yykyykyy.yy.',
    '.yy.yryyyyry.yy.',
    '....yyykkyyy....',
    '.....yyyyyy.....',
    '......yyyy......',
    '...y........y...',
    '..y....yy....y..',
    '.......yy.......',
    '................',
  ],
  gift: [
    '................',
    '................',
    '...ggg....ggg...',
    '..g..gg..gg..g..',
    '..g...gggg...g..',
    '...gggggggggg...',
    '.rwrrrrggrrrrrr.',
    '.rrrrrrggrrrrrr.',
    '.bbbbbbGGbbbbbb.',
    '..rrrrrggrrrrr..',
    '..rrrrrggrrrrr..',
    '..rrrrrggrrrrr..',
    '..rrrrrggrrrrr..',
    '..bbbbbGGbbbbb..',
    '................',
    '................',
  ],
  lock: [
    '................',
    '................',
    '......EEEE......',
    '.....E....E.....',
    '.....E....E.....',
    '.....E....E.....',
    '...YYYYYYYYYY...',
    '...YyyyyyyyyY...',
    '...YyyykkyyyY...',
    '...YyyykkyyyY...',
    '...YyyyykyyyY...',
    '...YyyyyyyyyY...',
    '...YYYYYYYYYY...',
    '................',
    '................',
    '................',
  ],
  sound: [
    '................',
    '................',
    '................',
    '......k.........',
    '.....kk....k....',
    '....kkk.....k...',
    '.kkkkkk..k...k..',
    '.kkkkkk...k..k..',
    '.kkkkkk...k..k..',
    '.kkkkkk..k...k..',
    '....kkk.....k...',
    '.....kk....k....',
    '......k.........',
    '................',
    '................',
    '................',
  ],
  mute: [
    '................',
    '................',
    '................',
    '......k.........',
    '.....kk.........',
    '....kkk.........',
    '.kkkkkk..r...r..',
    '.kkkkkk...r.r...',
    '.kkkkkk....r....',
    '.kkkkkk...r.r...',
    '....kkk..r...r..',
    '.....kk.........',
    '......k.........',
    '................',
    '................',
    '................',
  ],
  heart: [
    '.RR.RR.',
    'RwRRRRR',
    'RRRRRRR',
    '.RRRRR.',
    '..RRR..',
    '...R...',
  ],
  sparkle: [
    '...y...',
    '...y...',
    '..yyy..',
    'yyywyyy',
    '..yyy..',
    '...y...',
    '...y...',
  ],
  bell: [
    '....kk....',
    '...kyyk...',
    '..kyyyyk..',
    '..kywyyk..',
    '..kywyyk..',
    '.kyyyyyyk.',
    'kyyyyyyyyk',
    'kkkkkkkkkk',
    '....kk....',
  ],
  close: [
    'kk...kk',
    'kkk.kkk',
    '.kkkkk.',
    '..kkk..',
    '.kkkkk.',
    'kkk.kkk',
    'kk...kk',
  ],
  bow: [
    '.gggg....gggg.',
    'gGGggg..gggGGg',
    'gGG..gggg..GGg',
    '.gggg.GG.gggg.',
    '....gg..gg....',
  ],
  flame: [
    '..y..',
    '.yyy.',
    '.ywy.',
    'yywyy',
    'yywyy',
    '.yry.',
    '..r..',
  ],
};

/** Render a sprite as crisp SVG markup. */
export function sprite(name, className = '') {
  const grid = SPRITES[name];
  if (!grid) throw new Error(`Unknown sprite: ${name}`);
  const h = grid.length;
  const w = grid[0].length;
  let rects = '';
  grid.forEach((row, y) => {
    let x = 0;
    while (x < w) {
      const ch = row[x];
      let run = 1;
      while (x + run < w && row[x + run] === ch) run++;
      if (ch !== '.') rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${PALETTE[ch]}"/>`;
      x += run;
    }
  });
  return `<svg class="px ${className}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
}

// 3x5 pixel digits for the number candles.
const DIGITS = {
  0: ['###', '#.#', '#.#', '#.#', '###'],
  1: ['.#.', '##.', '.#.', '.#.', '###'],
  2: ['###', '..#', '###', '#..', '###'],
  3: ['###', '..#', '.##', '..#', '###'],
  4: ['#.#', '#.#', '###', '..#', '..#'],
  5: ['###', '#..', '###', '..#', '###'],
  6: ['###', '#..', '###', '#.#', '###'],
  7: ['###', '..#', '.#.', '.#.', '.#.'],
  8: ['###', '#.#', '###', '#.#', '###'],
  9: ['###', '#.#', '###', '..#', '###'],
};

/** A tall pixel number candle (11x26): wick, rounded outline, highlight, 2x digit, spiral stripes. */
export function numberCandleGrid(d) {
  const W = 11, H = 26;
  const inside = (x, y) => {
    if (y < 1 || y >= H || x < 0 || x >= W) return false;
    if ((y === 1 || y === H - 1) && (x < 2 || x > W - 3)) return false; // rounded corners
    if ((y === 2 || y === H - 2) && (x === 0 || x === W - 1)) return false;
    return true;
  };
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  g[0][5] = 'k'; // wick
  for (let y = 1; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      g[y][x] = edge ? 'k' : 'r';
    }
  }
  // Spiral stripes below the digit, a highlight down the left, shading at the base.
  for (let y = 16; y < H - 2; y++) {
    for (let x = 1; x < W - 1; x++) if (g[y][x] === 'r' && (x + y) % 5 < 2) g[y][x] = 'l';
  }
  for (let y = 3; y < H - 2; y++) if (g[y][2] === 'r') g[y][2] = 'o';
  for (let x = 2; x < W - 2; x++) if (g[H - 3][x] !== 'k') g[H - 3][x] = 'b';
  // Digit, scaled 2x, with a drop shadow.
  const glyph = DIGITS[d];
  const ox = 3, oy = 4;
  const cells = [];
  glyph.forEach((row, gy) => [...row].forEach((c, gx) => {
    if (c === '#') for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) cells.push([ox + gx * 2 + sx, oy + gy * 2 + sy]);
  }));
  for (const [x, y] of cells) if (g[y + 1][x + 1] !== 'k') g[y + 1][x + 1] = 'b';
  for (const [x, y] of cells) g[y][x] = 'w';
  return g.map((r) => r.join(''));
}

for (let d = 0; d <= 9; d++) SPRITES[`candle${d}`] = numberCandleGrid(d);
