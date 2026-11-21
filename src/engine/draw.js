/** Original placeholder pixel art. Drawn in code; no third-party images. */

export const C = {
  ink: "#2a1810",
  wall: "#f0d2a8",
  wall2: "#e4c094",
  tile: "#d9b07c",
  tile2: "#c99a64",
  grout: "#b88850",
  wood: "#8b4e28",
  wood2: "#6e3c1c",
  wood3: "#c47a40",
  sky: "#7ec4e8",
  sky2: "#c8e8f8",
  curtain: "#e87070",
  white: "#fff6e4",
  yolk: "#f0c43c",
  yolk2: "#e0a828",
  shell: "#fff8ec",
  shell2: "#edd7b0",
  mayo: "#f5e6b0",
  mayo2: "#e8d48a",
  cap: "#3a6ca8",
  pan: "#2c2420",
  pan2: "#1a1614",
  panHi: "#6a6058",
  stove: "#c43c34",
  stove2: "#8a281f",
  stoveTop: "#3a3230",
  plate: "#f4eee0",
  plate2: "#d0c6b4",
  chick: "#f5d64a",
  chick2: "#e0b830",
  leaf: "#6aaa4a",
};

const PAL = {
  k: C.ink,
  w: C.white,
  y: C.yolk,
  Y: C.yolk2,
  e: C.shell,
  E: C.shell2,
  m: C.mayo,
  M: C.mayo2,
  b: C.cap,
  n: C.pan,
  N: C.pan2,
  h: C.panHi,
  p: C.plate,
  P: C.plate2,
  c: C.chick,
  o: "#fffaf0",
  s: "#ffb070",
  u: "#8a5a3a",
  g: C.leaf,
  t: "#6ec8e8",
};

export function blit(ctx, ox, oy, rows, pal = PAL) {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === "." || ch === " ") continue;
      const color = pal[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

function fillOval(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  for (let j = 0; j < h; j++) {
    const ny = (j + 0.5) / h * 2 - 1;
    const rx = Math.sqrt(Math.max(0, 1 - ny * ny));
    const ww = Math.max(1, Math.round(rx * w));
    const ox = Math.round((w - ww) / 2);
    ctx.fillRect(x + ox, y + j, ww, 1);
  }
}

const WHISK = [
  ".k.k.k.",
  "k.k.k.k",
  ".k.k.k.",
  "..kkk..",
  "...u...",
  "...u...",
  "...u...",
  "...u...",
  "...k...",
];

const MAYO_IDLE = [
  "....kkkk....",
  "...kbwwbk...",
  "...kbwwbk...",
  "....kkkk....",
  "...kmmmMk...",
  "..kmmmmmMk..",
  ".kmmmmmmmmk.",
  "kmmmmYmmmmmk",
  "kmmmmmmmmmmk",
  "kmmmmmmmmmmk",
  "kmmmmmmmmmmk",
  "kmmmmmmmmmmk",
  ".kmmmmmmmmk.",
  "..kmmmmmmk..",
  "...kkkkkk...",
];

const MAYO_HELD = [
  "....kkkk....",
  "...kbwwbk...",
  "....kkkk....",
  "..kmmmmmMk..",
  ".kmmmmmmmmk.",
  "kmmmmYmmmmmk",
  "kmmmmmmmmmmk",
  "kmmmmmmmmmmk",
  ".kmmmmmmmmk.",
  "..kkkkkkkk..",
];

const GLOVE = [
  ".....kk.....",
  "....kwwk....",
  "....kwwk....",
  "....kwwk.kk.",
  "..kkkwwkkwwk",
  ".kwwwwwwwwwk",
  "kwwwwwwwwwwk",
  "kwwwwwwwwwwk",
  ".kwwwwwwwwk.",
  "..kwwwwwwk..",
  "...kkkkkk...",
];

const CHICK = [
  "..kkkk..",
  ".kcccck.",
  "kcckkcck",
  "kcYcccck",
  ".kcccck.",
  "..kssk..",
];

export function drawBackdrop(ctx, t) {
  ctx.fillStyle = C.wall;
  ctx.fillRect(0, 0, 160, 108);
  ctx.fillStyle = C.wall2;
  for (let y = 4; y < 70; y += 8) {
    for (let x = (y / 8) % 2 === 0 ? 4 : 8; x < 160; x += 8) {
      ctx.fillRect(x, y, 1, 1);
    }
  }

  drawWindow(ctx, 8, 5, t);
  drawShelf(ctx, 78, 8);

  ctx.fillStyle = C.grout;
  ctx.fillRect(0, 70, 160, 38);
  for (let row = 0; row < 4; row++) {
    const y = 70 + row * 9;
    const shift = row % 2 === 0 ? 0 : 8;
    for (let x = -8 + shift; x < 160; x += 16) {
      ctx.fillStyle = (row + Math.floor(x / 16)) % 2 === 0 ? C.tile : C.tile2;
      ctx.fillRect(x + 1, y + 1, 14, 7);
    }
  }

  ctx.fillStyle = C.wood;
  ctx.fillRect(0, 108, 160, 36);
  ctx.fillStyle = C.wood3;
  ctx.fillRect(0, 108, 160, 3);
  ctx.fillStyle = "#d49254";
  ctx.fillRect(0, 109, 160, 1);
  ctx.fillStyle = C.wood2;
  for (let y = 114; y < 144; y += 5) ctx.fillRect(0, y, 160, 1);

  drawStove(ctx, 84, 92);
}

function drawWindow(ctx, x, y, t) {
  ctx.fillStyle = C.ink;
  ctx.fillRect(x, y, 56, 40);
  ctx.fillStyle = C.sky;
  ctx.fillRect(x + 3, y + 3, 50, 34);
  ctx.fillStyle = C.sky2;
  ctx.fillRect(x + 5, y + 5, 18, 10);
  ctx.fillStyle = C.white;
  ctx.fillRect(x + 38, y + 6, 10, 6);
  ctx.fillRect(x + 42, y + 8, 8, 5);
  ctx.fillStyle = C.curtain;
  ctx.fillRect(x + 3, y + 3, 6, 34);
  ctx.fillRect(x + 47, y + 3, 6, 34);
  ctx.fillStyle = C.ink;
  ctx.fillRect(x + 28, y + 3, 2, 34);
  ctx.fillRect(x + 3, y + 19, 50, 2);
  const blink = Math.floor(t / 400) % 8 === 0;
  blit(ctx, x + 22, y + 22, CHICK);
  if (blink) {
    ctx.fillStyle = C.chick;
    ctx.fillRect(x + 24, y + 24, 2, 1);
    ctx.fillRect(x + 27, y + 24, 2, 1);
  }
}

function drawShelf(ctx, x, y) {
  ctx.fillStyle = C.ink;
  ctx.fillRect(x, y + 18, 74, 3);
  ctx.fillStyle = C.wood3;
  ctx.fillRect(x, y + 18, 74, 2);
  ctx.fillStyle = C.ink;
  ctx.fillRect(x + 10, y + 4, 6, 14);
  ctx.fillStyle = C.white;
  ctx.fillRect(x + 11, y + 5, 4, 12);
  ctx.fillStyle = C.ink;
  ctx.fillRect(x + 22, y + 6, 10, 12);
  ctx.fillStyle = C.yolk;
  ctx.fillRect(x + 23, y + 7, 8, 10);
  ctx.fillStyle = C.ink;
  ctx.fillRect(x + 38, y + 10, 7, 8);
  ctx.fillStyle = C.leaf;
  ctx.fillRect(x + 39, y + 11, 5, 6);
  ctx.fillStyle = C.ink;
  ctx.fillRect(x + 52, y + 3, 14, 15);
  ctx.fillStyle = C.white;
  ctx.fillRect(x + 53, y + 4, 12, 13);
  ctx.fillStyle = C.cap;
  ctx.fillRect(x + 56, y + 2, 6, 3);
}

function drawStove(ctx, x, y) {
  ctx.fillStyle = C.ink;
  ctx.fillRect(x, y, 52, 30);
  ctx.fillStyle = C.stove;
  ctx.fillRect(x + 1, y + 1, 50, 28);
  ctx.fillStyle = C.stoveTop;
  ctx.fillRect(x + 3, y + 3, 34, 16);
  ctx.fillStyle = C.ink;
  fillOval(ctx, x + 8, y + 5, 22, 12, C.ink);
  fillOval(ctx, x + 10, y + 6, 18, 10, "#2a2420");
  fillOval(ctx, x + 14, y + 8, 10, 6, C.panHi);
  ctx.fillStyle = C.stove2;
  ctx.fillRect(x + 1, y + 20, 50, 9);
  ctx.fillStyle = C.ink;
  ctx.fillRect(x + 8, y + 22, 7, 5);
  ctx.fillRect(x + 20, y + 22, 7, 5);
  ctx.fillStyle = C.plate;
  ctx.fillRect(x + 9, y + 23, 5, 3);
  ctx.fillRect(x + 21, y + 23, 5, 3);
  ctx.fillStyle = C.ink;
  ctx.fillRect(x + 39, y + 5, 11, 12);
  ctx.fillStyle = "#5a5048";
  ctx.fillRect(x + 40, y + 6, 9, 10);
}

function drawEgg(ctx, x, y) {
  fillOval(ctx, x, y, 13, 17, C.ink);
  fillOval(ctx, x + 1, y + 1, 11, 15, C.shell2);
  fillOval(ctx, x + 2, y + 2, 9, 12, C.shell);
  ctx.fillStyle = C.white;
  ctx.fillRect(x + 4, y + 4, 2, 3);
}

function drawBowl(ctx, x, y, state, t) {
  fillOval(ctx, x, y + 6, 38, 14, C.ink);
  fillOval(ctx, x + 1, y + 7, 36, 12, C.plate2);
  fillOval(ctx, x + 2, y, 34, 12, C.ink);
  fillOval(ctx, x + 3, y + 1, 32, 10, C.white);
  fillOval(ctx, x + 6, y + 3, 26, 7, "#e8dcc8");

  if (state === "one-egg" || state === "two-eggs") {
    fillOval(ctx, x + 8, y + 3, 20, 6, C.white);
    fillOval(ctx, x + 12, y + 4, 8, 4, C.yolk);
    if (state === "two-eggs") fillOval(ctx, x + 18, y + 4, 6, 3, C.yolk2);
  } else if (state === "mixed" || state === "mayo-mixed") {
    const col = state === "mayo-mixed" ? C.mayo : C.yolk;
    fillOval(ctx, x + 7, y + 3, 22, 6, col);
    ctx.fillStyle = state === "mayo-mixed" ? C.mayo2 : C.yolk2;
    const w = 4 + Math.floor((Math.sin(t / 180) + 1) * 3);
    ctx.fillRect(x + 12, y + 5, w, 1);
  }
}

function drawPan(ctx, x, y, state) {
  ctx.fillStyle = C.ink;
  ctx.fillRect(x + 28, y + 5, 18, 5);
  ctx.fillStyle = C.panHi;
  ctx.fillRect(x + 28, y + 6, 16, 3);
  ctx.fillStyle = C.ink;
  ctx.fillRect(x + 44, y + 4, 3, 7);
  fillOval(ctx, x, y, 32, 16, C.ink);
  fillOval(ctx, x + 2, y + 2, 28, 12, C.pan);
  fillOval(ctx, x + 5, y + 4, 22, 8, C.pan2);

  if (state === "batter") {
    fillOval(ctx, x + 6, y + 4, 20, 8, C.mayo);
    fillOval(ctx, x + 8, y + 5, 14, 5, C.yolk);
  } else if (state === "cooked") {
    fillOval(ctx, x + 6, y + 4, 20, 8, C.ink);
    fillOval(ctx, x + 7, y + 5, 18, 6, C.yolk);
    fillOval(ctx, x + 10, y + 6, 8, 3, C.yolk2);
  } else if (state === "folded") {
    fillOval(ctx, x + 8, y + 3, 16, 10, C.ink);
    fillOval(ctx, x + 9, y + 4, 14, 8, C.yolk);
    fillOval(ctx, x + 11, y + 5, 8, 4, C.yolk2);
  }
}

function drawPlate(ctx, x, y, state) {
  fillOval(ctx, x, y + 2, 30, 12, C.ink);
  fillOval(ctx, x + 1, y + 3, 28, 10, C.plate2);
  fillOval(ctx, x + 3, y, 24, 10, C.ink);
  fillOval(ctx, x + 4, y + 1, 22, 8, C.white);
  if (state === "served") {
    fillOval(ctx, x + 6, y - 2, 18, 10, C.ink);
    fillOval(ctx, x + 7, y - 1, 16, 8, C.yolk);
    fillOval(ctx, x + 9, y, 8, 4, C.yolk2);
    ctx.fillStyle = C.mayo;
    ctx.fillRect(x + 10, y + 1, 8, 1);
    ctx.fillRect(x + 12, y + 2, 5, 1);
  }
}

function drawOmelette(ctx, x, y, state) {
  const fold = state === "folded";
  fillOval(ctx, x, y, fold ? 18 : 22, fold ? 12 : 10, C.ink);
  fillOval(ctx, x + 1, y + 1, fold ? 16 : 20, fold ? 10 : 8, C.yolk);
  fillOval(ctx, x + 3, y + 2, fold ? 8 : 10, 4, C.yolk2);
}

const SPRITES = {
  egg(ctx, obj) {
    if (obj.state === "whole") drawEgg(ctx, obj.x, obj.y);
  },
  bowl(ctx, obj, extras) {
    drawBowl(ctx, obj.x, obj.y, obj.state, extras.t);
  },
  whisk(ctx, obj) {
    blit(ctx, obj.x, obj.y, WHISK);
  },
  mayo(ctx, obj) {
    blit(ctx, obj.x, obj.y, obj.state === "held" ? MAYO_HELD : MAYO_IDLE);
  },
  pan(ctx, obj) {
    drawPan(ctx, obj.x, obj.y, obj.state);
  },
  plate(ctx, obj) {
    drawPlate(ctx, obj.x, obj.y, obj.state);
  },
  omelette(ctx, obj) {
    drawOmelette(ctx, obj.x, obj.y, obj.state);
  },
};

export function drawScene(ctx, objects, extras) {
  drawBackdrop(ctx, extras.t);
  const list = [...objects].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  const follow = extras.follow;
  for (const obj of list) {
    if (obj.visible === false) continue;
    if (follow && (obj.id === follow || obj.sprite === follow)) continue;
    SPRITES[obj.sprite]?.(ctx, obj, extras);
  }

  if (follow && extras.pointer) {
    const proto = list.find((o) => o.id === follow || o.sprite === follow);
    const sprite = proto?.sprite ?? follow;
    SPRITES[sprite]?.(
      ctx,
      {
        ...(proto ?? { state: "idle", sprite }),
        x: Math.round(extras.pointer.x) - 3,
        y: Math.round(extras.pointer.y) - 8,
        visible: true,
      },
      extras,
    );
  }

  if (extras.overlay?.kind === "heat") {
    const p = Math.sin(extras.t / 80);
    const x = Math.round(extras.overlay.x ?? 100);
    const y = Math.round(extras.overlay.y ?? 88);
    ctx.fillStyle = "rgba(255, 180, 80, 0.45)";
    ctx.fillRect(x - 7, y + (p > 0 ? 0 : 1), 14, 1);
  }

  if (extras.hotspots && extras.showHints) {
    const a = 0.3 + Math.sin(extras.t / 180) * 0.2;
    ctx.strokeStyle = `rgba(255, 245, 180, ${a})`;
    ctx.lineWidth = 1;
    for (const h of extras.hotspots) {
      ctx.strokeRect(h.x + 0.5, h.y + 0.5, h.w - 1, h.h - 1);
    }
  }

  if (extras.debug && extras.hotspots) {
    ctx.fillStyle = "rgba(80, 200, 255, 0.25)";
    for (const h of extras.hotspots) ctx.fillRect(h.x, h.y, h.w, h.h);
  }

  if (extras.showGlove && extras.pointer) {
    blit(ctx, Math.round(extras.pointer.x) - 4, Math.round(extras.pointer.y) - 2, GLOVE);
  }
}

export class Fx {
  constructor() {
    this.list = [];
  }

  spawn(kind, x, y) {
    const n = kind === "crack" ? 8 : kind === "sparkle" ? 12 : 6;
    for (let i = 0; i < n; i++) {
      const ang = (Math.PI * 2 * i) / n + Math.random();
      const sp = kind === "sizzle" ? 0.15 : 0.4 + Math.random() * 0.6;
      this.list.push({
        x,
        y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - (kind === "sparkle" ? 0.3 : 0),
        life: 280 + Math.random() * 200,
        color:
          kind === "crack" ? C.shell : kind === "sizzle" ? "#ffb070" : "#fff4c0",
        size: 1,
      });
    }
  }

  update(dt) {
    for (const p of this.list) {
      p.x += p.vx * dt * 0.06;
      p.y += p.vy * dt * 0.06;
      p.vy += 0.012 * dt * 0.06;
      p.life -= dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  draw(ctx) {
    for (const p of this.list) {
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
  }
}
