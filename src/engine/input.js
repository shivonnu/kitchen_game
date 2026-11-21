/**
 * Pointer Events input. Mouse and touch share one code path.
 * Coordinates are mapped to the internal pixel buffer by the display.
 */
export function attachPointer(target, display, handlers) {
  const suppress = (e) => e.preventDefault();

  target.addEventListener("contextmenu", suppress);
  target.addEventListener("selectstart", suppress);
  target.addEventListener("dragstart", suppress);
  document.addEventListener("gesturestart", suppress);
  document.addEventListener("contextmenu", suppress);
  document.addEventListener("touchmove", suppress, { passive: false });

  function point(e) {
    return display.clientToWorld(e.clientX, e.clientY);
  }

  target.addEventListener("pointerdown", (e) => {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      /* capture is best-effort on some browsers */
    }
    handlers.down?.(e, point(e));
  });

  target.addEventListener("pointermove", (e) => {
    handlers.move?.(e, point(e));
  });

  function end(e) {
    handlers.up?.(e, point(e));
  }

  target.addEventListener("pointerup", end);
  target.addEventListener("pointercancel", end);
  target.addEventListener("lostpointercapture", () => handlers.cancel?.());
}
