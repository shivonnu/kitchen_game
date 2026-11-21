import { createDisplay } from "./engine/display.js";
import { attachPointer } from "./engine/input.js";
import { drawScene, Fx } from "./engine/draw.js";
import { createSfx } from "./engine/sfx.js";
import { RecipeRunner } from "./recipe-runner.js";

const DEBUG = new URLSearchParams(location.search).has("debug");

const els = {
  app: document.getElementById("app"),
  hud: document.getElementById("hud"),
  stage: document.getElementById("stage"),
  canvas: document.getElementById("game"),
  dishTitle: document.getElementById("dish-title"),
  stepLabel: document.getElementById("step-label"),
  stepList: document.getElementById("step-list"),
  instruction: document.getElementById("instruction"),
  hint: document.getElementById("hint"),
  feedback: document.getElementById("feedback"),
  progressWrap: document.getElementById("progress-wrap"),
  progressBar: document.getElementById("progress-bar"),
  titleScreen: document.getElementById("title-screen"),
  completeScreen: document.getElementById("complete-screen"),
  completeMessage: document.getElementById("complete-message"),
  retry: document.getElementById("retry"),
  toTitle: document.getElementById("to-title"),
};

const display = createDisplay(els.canvas, els.stage);
const sfx = createSfx();
const fx = new Fx();

let catalog = null;
let recipe = null;
let runner = null;
let screen = "title";
let pointer = { x: 80, y: 72, inside: false, down: false };
let feedback = "";
let feedbackUntil = 0;
let last = performance.now();

init().catch((err) => {
  els.instruction.textContent = "レシピを よめませんでした。";
  console.error(err);
});

async function init() {
  catalog = await loadJson("./data/recipes/index.json");
  const entry = catalog.recipes.find((r) => r.id === catalog.default) ?? catalog.recipes[0];
  recipe = await loadJson(`./data/recipes/${entry.src}`);
  runner = new RecipeRunner(recipe);
  bindUi();
  attachPointer(els.canvas, display, {
    down(_e, p) {
      pointer = { ...p, down: true };
      if (screen === "title") {
        startGame();
        return;
      }
      if (screen !== "playing") return;
      runner.pointerDown(p.x, p.y);
    },
    move(_e, p) {
      pointer = { ...p, down: pointer.down };
      if (screen === "playing") runner.pointerMove(p.x, p.y);
    },
    up(_e, p) {
      pointer = { ...p, down: false };
      if (screen === "playing") runner.pointerUp(p.x, p.y);
    },
    cancel() {
      pointer.down = false;
      if (screen === "playing") runner.cancel();
    },
  });
  els.titleScreen.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    startGame();
  });
  requestAnimationFrame(loop);
  syncHud();
}

function startGame() {
  sfx.unlock();
  sfx.ok();
  runner.reset();
  screen = "playing";
  els.titleScreen.hidden = true;
  els.completeScreen.hidden = true;
  feedback = recipe.intro;
  feedbackUntil = performance.now() + 2200;
  syncHud();
}

function bindUi() {
  els.retry.addEventListener("click", () => startGame());
  els.toTitle.addEventListener("click", () => {
    runner.reset();
    screen = "title";
    els.completeScreen.hidden = true;
    els.titleScreen.hidden = false;
    syncHud();
  });
}

function loop(now) {
  const dt = Math.min(40, now - last);
  last = now;
  if (screen === "playing") runner.tick(dt);
  handleEvents(now);
  fx.update(dt);
  if (screen === "playing" && runner.step?.action?.type === "hold" && runner.isPointerDown) {
    if (Math.random() < 0.2) {
      fx.spawn("sizzle", 108, 90);
      sfx.sizzle();
    }
  }
  render(now);
  if (now > feedbackUntil && feedback && screen === "playing") {
    feedback = "";
  }
  syncHud();
  requestAnimationFrame(loop);
}

function handleEvents(now) {
  if (!runner) return;
  for (const ev of runner.pullEvents()) {
    if (ev.type === "hit") {
      if (ev.fx === "crack") {
        sfx.crack();
        const hs = runner.recipe.steps[0].hotspots.find((h) => h.id === ev.hotspot);
        fx.spawn("crack", (hs?.x ?? 16) + 8, (hs?.y ?? 86) + 10);
      } else {
        sfx.tap();
      }
    } else if (ev.type === "stir") {
      if (Math.random() < 0.15) sfx.stir();
    } else if (ev.type === "grab") {
      sfx.tap();
    } else if (ev.type === "miss") {
      sfx.miss();
      if (ev.text) {
        feedback = ev.text;
        feedbackUntil = now + 1400;
      }
    } else if (ev.type === "announce") {
      feedback = ev.text;
      feedbackUntil = now + 1800;
    } else if (ev.type === "step-complete") {
      sfx.ok();
      fx.spawn("sparkle", 80, 72);
      feedback = "いい感じ！";
      feedbackUntil = now + 900;
    } else if (ev.type === "step-start") {
      syncHud();
    } else if (ev.type === "recipe-complete") {
      sfx.done();
      fx.spawn("sparkle", 140, 110);
      screen = "complete";
      els.completeMessage.textContent = recipe.completeMessage;
      els.completeScreen.hidden = false;
    }
  }
}

function render(now) {
  const ctx = display.ctx;
  const mixing = screen === "playing" && runner?.step?.action?.type === "stir" && runner.isPointerDown;
  const cooking = screen === "playing" && runner?.step?.id === "cook" && runner.progress > 0;
  drawScene(ctx, runner ? runner.listedObjects() : [], {
    t: now,
    pointer,
    showGlove: pointer.inside || pointer.down,
    showHints: screen === "playing",
    hotspots: screen === "playing" ? runner.step?.hotspots : null,
    mixing,
    cooking,
    debug: DEBUG,
  });
  fx.draw(ctx);
}

function syncHud() {
  if (!recipe || !runner) return;
  els.app.classList.toggle("is-overlay", screen === "title" || screen === "complete");
  const step = runner.step;
  const i = runner.stepIndex;
  els.dishTitle.textContent = recipe.title;
  els.stepLabel.textContent =
    screen === "complete"
      ? "完成！"
      : `てじゅん ${i + 1} / ${recipe.steps.length}`;
  els.instruction.textContent =
    screen === "title"
      ? "タップして スタート"
      : screen === "complete"
        ? recipe.completeMessage
        : (step?.instruction ?? "");
  els.hint.textContent = screen === "playing" ? (step?.hint ?? "") : "";
  els.feedback.textContent = screen === "playing" ? feedback : "";
  els.stepList.innerHTML = recipe.steps
    .map((s, idx) => {
      const cls = idx === i && screen === "playing" ? "current" : "";
      const mark = idx < i || screen === "complete" ? "✓" : idx === i ? "▶" : "·";
      return `<span class="${cls}">${mark}${s.title}</span>`;
    })
    .join(" ");

  const needsBar =
    screen === "playing" && (step?.action?.type === "hold" || step?.action?.type === "stir");
  els.progressWrap.classList.toggle("visible", needsBar);
  els.progressBar.style.width = `${Math.round(runner.progress01 * 100)}%`;
}

async function loadJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}
