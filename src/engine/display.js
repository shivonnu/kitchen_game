/** Internal pixel buffer size. SFC-like, small enough for 2× on phones. */
export const INTERNAL_W = 160;
export const INTERNAL_H = 144;

const TILE_PX = 16;

/**
 * Integer-scale a 160×144 canvas inside a stage, and tile a kitchen-wall
 * pattern in the leftover margin (never letterbox with black bars).
 */
export function createDisplay(canvas, stage) {
  const ctx = canvas.getContext("2d", { alpha: false });
  canvas.width = INTERNAL_W;
  canvas.height = INTERNAL_H;
  ctx.imageSmoothingEnabled = false;

  let scale = 1;
  const wall = makeWallTile();

  function relayout() {
    const w = Math.max(1, stage.clientWidth);
    const h = Math.max(1, stage.clientHeight);
    scale = Math.max(1, Math.floor(Math.min(w / INTERNAL_W, h / INTERNAL_H)));
    canvas.style.width = `${INTERNAL_W * scale}px`;
    canvas.style.height = `${INTERNAL_H * scale}px`;
    const tile = TILE_PX * Math.max(2, Math.min(scale, 6));
    stage.style.backgroundImage = `url(${wall})`;
    stage.style.backgroundSize = `${tile}px ${tile}px`;
    stage.style.backgroundRepeat = "repeat";
    return scale;
  }

  function clientToWorld(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const inside =
      clientX >= r.left && clientX < r.right && clientY >= r.top && clientY < r.bottom;
    const x = ((clientX - r.left) / Math.max(1, r.width)) * INTERNAL_W;
    const y = ((clientY - r.top) / Math.max(1, r.height)) * INTERNAL_H;
    return { x, y, inside };
  }

  const ro = new ResizeObserver(() => relayout());
  ro.observe(stage);
  relayout();

  return {
    ctx,
    canvas,
    get scale() {
      return scale;
    },
    relayout,
    clientToWorld,
  };
}

function makeWallTile() {
  const c = document.createElement("canvas");
  c.width = TILE_PX;
  c.height = TILE_PX;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.fillStyle = "#e2b57a";
  g.fillRect(0, 0, TILE_PX, TILE_PX);
  g.fillStyle = "#c99458";
  g.fillRect(0, 0, TILE_PX, 1);
  g.fillRect(0, 8, TILE_PX, 1);
  g.fillStyle = "#d4a466";
  g.fillRect(0, 0, 1, 8);
  g.fillRect(8, 8, 1, 8);
  g.fillStyle = "#f0d0a0";
  g.fillRect(2, 3, 1, 1);
  g.fillRect(11, 11, 1, 1);
  g.fillStyle = "#b8834a";
  g.fillRect(7, 7, 1, 1);
  return c.toDataURL("image/png");
}
