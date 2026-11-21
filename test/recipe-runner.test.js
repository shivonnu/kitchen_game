import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  RecipeRunner,
  hitTest,
  hotspotCenter,
  resolveAnchor,
} from "../src/recipe-runner.js";

const recipe = JSON.parse(
  await readFile(new URL("../data/recipes/mayo-omelette.json", import.meta.url), "utf8"),
);

function center(h) {
  return { x: h.x + h.w / 2, y: h.y + h.h / 2 };
}

function tap(runner, hotspot) {
  const { x, y } = center(hotspot);
  runner.pointerDown(x, y);
  runner.pointerUp(x, y);
}

function drag(runner, from, to) {
  const a = center(from);
  const b = center(to);
  runner.pointerDown(a.x, a.y);
  runner.pointerMove(b.x, b.y);
  runner.pointerUp(b.x, b.y);
}

test("hitTest finds the topmost matching hotspot", () => {
  const a = { id: "a", x: 0, y: 0, w: 10, h: 10 };
  const b = { id: "b", x: 5, y: 5, w: 10, h: 10 };
  assert.equal(hitTest([a, b], 6, 6).id, "b");
  assert.equal(hitTest([a, b], 1, 1).id, "a");
  assert.equal(hitTest([a, b], 40, 40), null);
});

test("hit events use the tapped hotspot coordinates, not steps[0]", () => {
  const runner = new RecipeRunner(recipe);
  const eggB = runner.step.hotspots.find((h) => h.id === "egg-b");
  tap(runner, eggB);
  const hit = runner.pullEvents().find((e) => e.type === "hit");
  assert.ok(hit);
  assert.equal(hit.hotspot, "egg-b");
  assert.equal(hit.fx, "crack");
  const mid = hotspotCenter(eggB);
  assert.equal(hit.x, mid.x);
  assert.equal(hit.y, mid.y);
});

test("resolveAnchor reads fx targets from step/recipe data", () => {
  const runner = new RecipeRunner(recipe);
  const panHs = recipe.steps.find((s) => s.id === "cook").hotspots[0];
  runner.stepIndex = recipe.steps.findIndex((s) => s.id === "cook");
  const fromHotspot = resolveAnchor(runner, "pan");
  assert.equal(fromHotspot.x, panHs.x + panHs.w / 2);
  const fromObject = resolveAnchor(runner, "bowl");
  assert.equal(fromObject.x, runner.objects.bowl.x);
  const literal = resolveAnchor(runner, { x: 12, y: 34 });
  assert.deepEqual(literal, { x: 12, y: 34 });
});

test("cook effects live on the step; pouring is its own drag step", () => {
  const pour = recipe.steps.find((s) => s.id === "pour");
  const cook = recipe.steps.find((s) => s.id === "cook");
  assert.equal(pour.action.type, "drag");
  assert.equal(pour.action.from, "bowl");
  assert.equal(pour.action.to, "pan");
  assert.equal(cook.onEnter, undefined);
  assert.equal(cook.fx.whileActive.kind, "sizzle");
  assert.equal(cook.fx.overlay.kind, "heat");
  assert.equal(cook.fx.overlay.at, "pan");
});

test("mayo omelette: crack, mix, mayo, pour, cook, fold, plate", () => {
  const runner = new RecipeRunner(recipe);
  assert.equal(runner.step.id, "crack-eggs");
  assert.equal(recipe.steps.length, 7);

  tap(runner, runner.step.hotspots[0]);
  assert.equal(runner.objects["egg-a"].visible, false);
  assert.equal(runner.objects.bowl.state, "one-egg");
  tap(runner, runner.step.hotspots[1]);
  assert.equal(runner.step.id, "mix");
  assert.equal(runner.objects.bowl.state, "two-eggs");

  const bowl = runner.step.hotspots[0];
  const c = center(bowl);
  runner.pointerDown(c.x, c.y);
  for (let i = 0; i < 80; i++) {
    const ang = i * 0.5;
    runner.pointerMove(c.x + Math.cos(ang) * 12, c.y + Math.sin(ang) * 10);
  }
  runner.pointerUp(c.x, c.y);
  assert.equal(runner.step.id, "add-mayo");
  assert.equal(runner.objects.bowl.state, "mixed");

  drag(
    runner,
    runner.step.hotspots.find((h) => h.id === "mayo"),
    runner.step.hotspots.find((h) => h.id === "bowl"),
  );
  assert.equal(runner.step.id, "pour");
  assert.equal(runner.objects.bowl.state, "mayo-mixed");
  assert.equal(runner.objects.pan.state, "empty");

  drag(
    runner,
    runner.step.hotspots.find((h) => h.id === "bowl"),
    runner.step.hotspots.find((h) => h.id === "pan"),
  );
  assert.equal(runner.step.id, "cook");
  assert.equal(runner.objects.bowl.state, "empty");
  assert.equal(runner.objects.pan.state, "batter");

  const pan = center(runner.step.hotspots[0]);
  runner.pointerDown(pan.x, pan.y);
  runner.pointerMove(pan.x, pan.y);
  runner.tick(2000);
  assert.equal(runner.step.id, "fold");
  assert.equal(runner.objects.pan.state, "cooked");

  runner.pointerDown(pan.x + 10, pan.y);
  runner.pointerMove(pan.x - 20, pan.y);
  runner.pointerUp(pan.x - 20, pan.y);
  assert.equal(runner.step.id, "plate");
  assert.equal(runner.objects.pan.state, "folded");

  drag(
    runner,
    runner.step.hotspots.find((h) => h.id === "pan"),
    runner.step.hotspots.find((h) => h.id === "plate"),
  );
  assert.equal(runner.status, "complete");
  assert.equal(runner.objects.plate.state, "served");
  assert.equal(runner.objects.pan.state, "empty");
  const done = runner.pullEvents().find((e) => e.type === "recipe-complete");
  assert.equal(done.fx, "sparkle");
  assert.ok(Number.isFinite(done.x));
  assert.ok(Number.isFinite(done.y));
});

test("tapping outside an egg does not crack it", () => {
  const runner = new RecipeRunner(recipe);
  runner.pointerDown(80, 20);
  runner.pointerUp(80, 20);
  assert.equal(runner.objects["egg-a"].visible, true);
  assert.equal(runner.progress, 0);
  const events = runner.pullEvents();
  assert.ok(events.some((e) => e.type === "miss"));
});

test("main.js does not hard-code mayo omelette steps or effect positions", async () => {
  const src = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  assert.equal(src.includes("steps[0]"), false);
  assert.equal(src.includes('id === "cook"'), false);
  assert.equal(src.includes("=== \"cook\""), false);
  assert.equal(src.includes("108, 90"), false);
  assert.equal(src.includes("140, 110"), false);
  assert.equal(src.includes("crack-eggs"), false);
});
