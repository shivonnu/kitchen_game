import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { RecipeRunner, hitTest } from "../src/recipe-runner.js";

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

test("hitTest finds the topmost matching hotspot", () => {
  const a = { id: "a", x: 0, y: 0, w: 10, h: 10 };
  const b = { id: "b", x: 5, y: 5, w: 10, h: 10 };
  assert.equal(hitTest([a, b], 6, 6).id, "b");
  assert.equal(hitTest([a, b], 1, 1).id, "a");
  assert.equal(hitTest([a, b], 40, 40), null);
});

test("mayo omelette: crack two eggs then mix, mayo, cook, fold, plate", () => {
  const runner = new RecipeRunner(recipe);
  assert.equal(runner.step.id, "crack-eggs");

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

  const mayoHs = runner.step.hotspots.find((h) => h.id === "mayo");
  const bowlHs = runner.step.hotspots.find((h) => h.id === "bowl");
  const m = center(mayoHs);
  const b = center(bowlHs);
  runner.pointerDown(m.x, m.y);
  runner.pointerMove(b.x, b.y);
  runner.pointerUp(b.x, b.y);
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

  const plate = center(runner.step.hotspots.find((h) => h.id === "plate"));
  const panHs = center(runner.step.hotspots.find((h) => h.id === "pan"));
  runner.pointerDown(panHs.x, panHs.y);
  runner.pointerMove(plate.x, plate.y);
  runner.pointerUp(plate.x, plate.y);
  assert.equal(runner.status, "complete");
  assert.equal(runner.objects.plate.state, "served");
  assert.equal(runner.objects.pan.state, "empty");
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
