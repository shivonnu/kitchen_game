/**
 * Generic recipe runner. All dish-specific behaviour lives in JSON:
 * hotspots, action type, completion condition, and visual mutations.
 */

export function hitTest(hotspots, x, y) {
  if (!hotspots) return null;
  for (let i = hotspots.length - 1; i >= 0; i--) {
    const h = hotspots[i];
    if (x >= h.x && y >= h.y && x < h.x + h.w && y < h.y + h.h) return h;
  }
  return null;
}

export function hotspotCenter(h) {
  if (!h) return null;
  return { x: h.x + h.w / 2, y: h.y + h.h / 2 };
}

/** Resolve a recipe fx `at` value: `{x,y}`, object id, hotspot id/role, or `"pointer"`. */
export function resolveAnchor(runner, at) {
  if (at == null || !runner) return null;
  if (typeof at === "object" && Number.isFinite(at.x) && Number.isFinite(at.y)) {
    return { x: at.x, y: at.y };
  }
  if (typeof at !== "string") return null;
  if (at === "pointer" && runner.lastMove) {
    return { x: runner.lastMove.x, y: runner.lastMove.y };
  }
  const hs = runner.step?.hotspots?.find((h) => h.id === at || h.role === at);
  if (hs) return hotspotCenter(hs);
  const obj = runner.objects?.[at];
  if (obj) return { x: obj.x, y: obj.y };
  return null;
}

export function createWorld(recipe) {
  const objects = {};
  for (const obj of recipe.scene.objects) {
    objects[obj.id] = {
      id: obj.id,
      sprite: obj.sprite,
      x: obj.x,
      y: obj.y,
      z: obj.z ?? 0,
      state: obj.state ?? "default",
      visible: obj.visible !== false,
    };
  }
  return objects;
}

const TAP_SLOP = 6;

export class RecipeRunner {
  constructor(recipe) {
    this.recipe = recipe;
    this.reset();
  }

  reset() {
    this.objects = createWorld(this.recipe);
    this.stepIndex = 0;
    this.status = "playing";
    this.progress = 0;
    this.target = 1;
    this.hits = new Set();
    this.holdMs = 0;
    this.stirDist = 0;
    this.drag = null;
    this.swipe = null;
    this.isPointerDown = false;
    this.down = null;
    this.lastMove = null;
    this.events = [];
    this.locked = false;
    this._recomputeTarget();
    this._apply(this.step?.onEnter);
  }

  get step() {
    return this.recipe.steps[this.stepIndex] ?? null;
  }

  get progress01() {
    if (this.status === "complete") return 1;
    return this.target > 0 ? Math.min(1, this.progress / this.target) : 0;
  }

  pullEvents() {
    const out = this.events;
    this.events = [];
    return out;
  }

  pointerDown(x, y) {
    if (this.locked || this.status !== "playing") return;
    const step = this.step;
    if (!step) return;
    this.isPointerDown = true;
    const hotspot = hitTest(step.hotspots, x, y);
    this.down = { x, y, hotspot, t: 0 };
    this.lastMove = { x, y };

    if (!step.playable) {
      this.down.stub = true;
      return;
    }

    const type = step.action?.type;
    if (type === "drag" && hotspot && this._isFromHotspot(hotspot)) {
      const grabId = step.action.grab;
      const obj = grabId ? this.objects[grabId] : null;
      this.drag = {
        grabId,
        saved: obj
          ? { x: obj.x, y: obj.y, state: obj.state, visible: obj.visible }
          : null,
        ox: obj ? x - obj.x : 0,
        oy: obj ? y - obj.y : 0,
      };
      this._apply(step.action.onGrab);
      this._emit({ type: "grab", id: grabId });
    }
    if (type === "swipe" && hotspot) {
      this.swipe = { x, y };
    }
    if ((type === "hold" || type === "stir") && hotspot) {
      this._emit({ type: "engage" });
    }
  }

  pointerMove(x, y) {
    if (!this.isPointerDown || this.locked || this.status !== "playing") {
      this.lastMove = { x, y };
      return;
    }
    const step = this.step;
    if (!step?.playable) {
      this.lastMove = { x, y };
      return;
    }
    const prev = this.lastMove || { x, y };
    const dx = x - prev.x;
    const dy = y - prev.y;
    this.lastMove = { x, y };

    const type = step.action?.type;
    if (type === "drag" && this.drag) {
      const obj = this.drag.grabId ? this.objects[this.drag.grabId] : null;
      if (obj) {
        obj.x = x - this.drag.ox;
        obj.y = y - this.drag.oy;
      }
    }
    if (type === "stir") {
      const hotspot = hitTest(step.hotspots, x, y);
      if (hotspot) {
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
          this.stirDist += dist;
          this.progress = this.stirDist;
          if (dist > 1.2) this._emit({ type: "stir" });
          this._checkComplete();
        }
      }
    }
  }

  pointerUp(x, y) {
    if (!this.isPointerDown) return;
    this.isPointerDown = false;
    if (this.locked || this.status !== "playing") {
      this._cancelDrag();
      return;
    }
    const step = this.step;
    if (!step) return;

    if (!step.playable) {
      this._completeStep();
      this.down = null;
      return;
    }

    const type = step.action?.type ?? "tap";
    const hotspot = hitTest(step.hotspots, x, y);

    if (type === "tap" || type === "repeated-tap") {
      const start = this.down;
      const moved = start ? Math.hypot(x - start.x, y - start.y) : 99;
      const same =
        hotspot &&
        start?.hotspot &&
        hotspot.id === start.hotspot.id &&
        moved <= TAP_SLOP;
      if (same) this._registerTap(hotspot);
      else if (!hotspot) this._miss();
    } else if (type === "drag") {
      this._finishDrag(hotspot);
    } else if (type === "swipe") {
      this._finishSwipe(x, y, hotspot);
    } else if (type === "hold") {
      if (this.progress < this.target) this.holdMs = this.progress;
    }

    this.down = null;
    this.swipe = null;
  }

  cancel() {
    this.isPointerDown = false;
    this._cancelDrag();
    this.down = null;
    this.swipe = null;
  }

  tick(dtMs) {
    if (this.locked || this.status !== "playing" || !this.step?.playable) return;
    const step = this.step;
    if (step.action?.type === "hold" && this.isPointerDown) {
      const pos = this.lastMove;
      const hotspot = pos ? hitTest(step.hotspots, pos.x, pos.y) : null;
      if (hotspot) {
        this.holdMs += dtMs;
        this.progress = this.holdMs;
        this._checkComplete();
      }
    }
  }

  listedObjects() {
    return Object.values(this.objects).sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  }

  _isFromHotspot(hotspot) {
    const from = this.step?.action?.from;
    if (!from) return true;
    return hotspot.id === from || hotspot.role === from;
  }

  _registerTap(hotspot) {
    const step = this.step;
    if (step.action?.oncePerHotspot) {
      if (this.hits.has(hotspot.id)) {
        this._emit({ type: "feedback", text: step.feedback?.repeat });
        return;
      }
      this.hits.add(hotspot.id);
    }
    this._apply(hotspot.onHit);
    this.progress += 1;
    this._applyProgressVisual();
    const pos = hotspotCenter(hotspot);
    const kind = hotspot.onHit?.fx ?? step.fx?.hit?.kind ?? step.action?.fx;
    this._emit({
      type: "hit",
      hotspot: hotspot.id,
      fx: kind,
      sfx: hotspot.onHit?.sfx ?? step.fx?.hit?.sfx ?? kind,
      x: pos?.x,
      y: pos?.y,
    });
    this._checkComplete();
  }

  _finishDrag(hotspot) {
    const step = this.step;
    const to = step.action?.to;
    const ok = hotspot && (hotspot.id === to || hotspot.role === to);
    if (ok) {
      this._restoreGrab();
      this.progress = this.target;
      this._apply(step.onComplete);
      this._completeStep();
    } else {
      this._cancelDrag();
      this._miss();
    }
    this.drag = null;
  }

  _finishSwipe(x, y, hotspot) {
    const step = this.step;
    const start = this.swipe;
    if (!start) return;
    const dx = x - start.x;
    const dy = y - start.y;
    const need = step.action?.distance ?? 20;
    const dir = step.action?.direction ?? "left";
    let ok = false;
    if (dir === "left") ok = dx <= -need && Math.abs(dy) < need * 1.4;
    else if (dir === "right") ok = dx >= need && Math.abs(dy) < need * 1.4;
    else if (dir === "up") ok = dy <= -need && Math.abs(dx) < need * 1.4;
    else if (dir === "down") ok = dy >= need && Math.abs(dx) < need * 1.4;
    else ok = Math.hypot(dx, dy) >= need;
    if (ok && (hotspot || hitTest(step.hotspots, start.x, start.y))) {
      this.progress = this.target;
      this._apply(step.onComplete);
      this._completeStep();
    } else {
      this._miss();
    }
  }

  _restoreGrab() {
    if (!this.drag?.saved || !this.drag.grabId) return;
    const obj = this.objects[this.drag.grabId];
    if (!obj) return;
    obj.x = this.drag.saved.x;
    obj.y = this.drag.saved.y;
  }

  _cancelDrag() {
    if (!this.drag) return;
    const obj = this.drag.grabId ? this.objects[this.drag.grabId] : null;
    if (obj && this.drag.saved) {
      obj.x = this.drag.saved.x;
      obj.y = this.drag.saved.y;
      obj.state = this.drag.saved.state;
      obj.visible = this.drag.saved.visible;
    }
    this._apply(this.step?.action?.onCancel);
    this.drag = null;
  }

  _miss() {
    const text = this.step?.feedback?.miss;
    this._emit({ type: "miss", text });
  }

  _applyProgressVisual() {
    const list = this.step?.visualProgress;
    if (!list) return;
    for (const v of list) {
      if (v.at === this.progress) this._apply(v);
    }
  }

  _recomputeTarget() {
    const step = this.step;
    if (!step) {
      this.target = 1;
      this.progress = 0;
      return;
    }
    this.progress = 0;
    this.holdMs = 0;
    this.stirDist = 0;
    this.hits = new Set();
    const complete = step.complete ?? {};
    if (complete.type === "taps" || complete.type === "count") {
      this.target = complete.count ?? 1;
    } else if (complete.type === "hold") {
      this.target = complete.ms ?? 1000;
    } else if (complete.type === "distance") {
      this.target = complete.px ?? 200;
    } else {
      this.target = 1;
    }
  }

  _checkComplete() {
    if (this.progress >= this.target) {
      this._apply(this.step?.onComplete);
      this._completeStep();
    }
  }

  _completeStep() {
    if (this.locked) return;
    this.locked = true;
    this.isPointerDown = false;
    this.drag = null;
    const finished = this.step;
    const stepFx = finished?.fx?.complete;
    const stepPos = resolveAnchor(this, stepFx?.at) ?? { x: 80, y: 72 };
    this._emit({
      type: "step-complete",
      id: finished?.id,
      fx: stepFx?.kind ?? "sparkle",
      sfx: stepFx?.sfx ?? "ok",
      x: stepPos.x,
      y: stepPos.y,
    });
    const next = this.stepIndex + 1;
    if (next >= this.recipe.steps.length) {
      this.status = "complete";
      this.stepIndex = this.recipe.steps.length - 1;
      const doneFx = this.recipe.fx?.complete;
      const donePos = resolveAnchor(this, doneFx?.at) ?? { x: 80, y: 72 };
      this._emit({
        type: "recipe-complete",
        fx: doneFx?.kind ?? "sparkle",
        sfx: doneFx?.sfx ?? "done",
        x: donePos.x,
        y: donePos.y,
      });
      return;
    }
    this.stepIndex = next;
    this._recomputeTarget();
    this._apply(this.step?.onEnter);
    this.locked = false;
    this._emit({ type: "step-start", id: this.step.id });
  }

  _apply(patch) {
    if (!patch) return;
    if (patch.set) {
      for (const [id, state] of Object.entries(patch.set)) {
        const obj = this.objects[id];
        if (!obj) continue;
        if (state === false) {
          obj.visible = false;
        } else {
          obj.visible = true;
          obj.state = state;
        }
      }
    }
    if (patch.hide) {
      for (const id of patch.hide) {
        if (this.objects[id]) this.objects[id].visible = false;
      }
    }
    if (patch.show) {
      for (const id of patch.show) {
        if (this.objects[id]) this.objects[id].visible = true;
      }
    }
    if (patch.move) {
      for (const [id, pos] of Object.entries(patch.move)) {
        const obj = this.objects[id];
        if (!obj) continue;
        if (pos.x != null) obj.x = pos.x;
        if (pos.y != null) obj.y = pos.y;
      }
    }
    if (patch.announce) {
      this._emit({ type: "announce", text: patch.announce });
    }
  }

  _emit(event) {
    this.events.push(event);
  }
}
