import { createDisplay } from "./engine/display.js";
import { attachPointer } from "./engine/input.js";
import { drawScene, Fx } from "./engine/draw.js";
import { createSfx } from "./engine/sfx.js";
import { RecipeRunner, resolveAnchor } from "./recipe-runner.js";

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
  titleDish: document.getElementById("title-dish"),
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
  if (els.titleDish) els.titleDish.textContent = `きょうの おかず：${recipe.title}`;
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
  runWhileActiveFx();
  render(now);
  if (now > feedbackUntil && feedback && screen === "playing") {
    feedback = "";
  }
  syncHud();
  requestAnimationFrame(loop);
}

function playFx(ev) {
  sfx.play(ev.sfx ?? ev.fx);
  if (ev.fx && Number.isFinite(ev.x) && Number.isFinite(ev.y)) {
    fx.spawn(ev.fx, ev.x, ev.y);
  }
}

function runWhileActiveFx() {
  if (screen !== "playing" || !runner?.isPointerDown) return;
  const spec = runner.step?.fx?.whileActive;
  if (!spec) return;
  if (Math.random() >= (spec.chance ?? 1)) return;
  const pos = resolveAnchor(runner, spec.at) ?? runner.lastMove;
  if (!pos) return;
  playFx({ fx: spec.kind, sfx: spec.sfx ?? spec.kind, x: pos.x, y: pos.y });
}

function handleEvents(now) {
  if (!runner) return;
  for (const ev of runner.pullEvents()) {
    if (ev.type === "hit") {
      playFx(ev.fx || ev.sfx ? ev : { ...ev, sfx: "tap" });
    } else if (ev.type === "stir") {
      if (Math.random() < 0.15) sfx.play("stir");
    } else if (ev.type === "grab") {
      sfx.play("tap");
    } else if (ev.type === "miss") {
      sfx.play("miss");
      if (ev.text) {
        feedback = ev.text;
        feedbackUntil = now + 1400;
      }
    } else if (ev.type === "announce") {
      feedback = ev.text;
      feedbackUntil = now + 1800;
    } else if (ev.type === "step-complete") {
      playFx(ev);
      feedback = "いい感じ！";
      feedbackUntil = now + 900;
    } else if (ev.type === "step-start") {
      syncHud();
    } else if (ev.type === "recipe-complete") {
      playFx(ev);
      screen = "complete";
      els.completeMessage.textContent = recipe.completeMessage;
      els.completeScreen.hidden = false;
    }
  }
}

function currentOverlay() {
  if (screen !== "playing") return null;
  const spec = runner?.step?.fx?.overlay;
  if (!spec) return null;
  if (spec.when === "progress" && runner.progress <= 0) return null;
  if (spec.when === "held" && !runner.isPointerDown) return null;
  const pos = resolveAnchor(runner, spec.at);
  return { kind: spec.kind, x: pos?.x, y: pos?.y };
}

function render(now) {
  const ctx = display.ctx;
  const follow =
    screen === "playing" && runner?.isPointerDown ? runner.step?.fx?.follow : null;
  drawScene(ctx, runner ? runner.listedObjects() : [], {
    t: now,
    pointer,
    showGlove: pointer.inside || pointer.down,
    showHints: screen === "playing",
    hotspots: screen === "playing" ? runner.step?.hotspots : null,
    follow,
    overlay: currentOverlay(),
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
