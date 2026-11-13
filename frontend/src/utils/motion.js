import gsap from 'gsap';

const pillStateByFill = new WeakMap();

/**
 * Compute inset edges (t, r, b, l) of an active tab element relative to its nav container.
 */
export function getEdges(container, btn) {
  return {
    t: btn.offsetTop,
    l: btn.offsetLeft,
    r: container.offsetWidth - (btn.offsetLeft + btn.offsetWidth),
    b: container.offsetHeight - (btn.offsetTop + btn.offsetHeight),
  };
}

/**
 * Compute inset edges (t, r, b, l) of an active element relative to its overlay fill box
 * using bounding client rects (safe regardless of padding, borders, or flex/grid wrapping).
 */
export function getRelativeEdges(fillEl, btnEl) {
  const fillRect = fillEl.getBoundingClientRect();
  const btnRect = btnEl.getBoundingClientRect();
  return {
    t: Math.max(0, Math.round(btnRect.top - fillRect.top)),
    l: Math.max(0, Math.round(btnRect.left - fillRect.left)),
    r: Math.max(0, Math.round(fillRect.right - btnRect.right)),
    b: Math.max(0, Math.round(fillRect.bottom - btnRect.bottom)),
  };
}

/**
 * Animate a dual-layer clip-path pill along either 'horizontal' or 'vertical' axis
 * so the leading edge stretches ahead (0.32s-0.35s) and the trailing edge catches up (0.52s-0.55s).
 */
export function slideFill(fill, to, immediate = false, options = {}) {
  if (!fill || !to) return;
  const { axis = 'horizontal', radius = '99px' } = options;

  const clip = (e) => `inset(${e.t}px ${e.r}px ${e.b}px ${e.l}px round ${radius})`;
  let state = pillStateByFill.get(fill);

  if (!state || immediate) {
    if (state) gsap.killTweensOf(state);
    state = { ...to };
    pillStateByFill.set(fill, state);
    gsap.set(fill, { clipPath: clip(state) });
    return;
  }

  const paint = () => gsap.set(fill, { clipPath: clip(state) });
  gsap.killTweensOf(state);

  if (axis === 'vertical') {
    const down = to.t > state.t;
    const [lead, trail] = down ? ['b', 't'] : ['t', 'b'];
    gsap.to(state, {
      [lead]: to[lead],
      duration: 0.32,
      ease: 'power3.out',
      onUpdate: paint,
    });
    gsap.to(state, {
      [trail]: to[trail],
      duration: 0.52,
      ease: 'power2.inOut',
      onUpdate: paint,
    });
    gsap.to(state, {
      l: to.l,
      r: to.r,
      duration: 0.32,
      ease: 'power2.out',
      onUpdate: paint,
    });
    return;
  }

  const fwd = to.l > state.l;
  // Leading edge stretches ahead while trailing edge catches up from live current state
  const [lead, trail] = fwd ? ['r', 'l'] : ['l', 'r'];
  gsap.to(state, {
    [lead]: to[lead],
    duration: 0.35,
    ease: 'power3.out',
    onUpdate: paint,
  });
  gsap.to(state, {
    [trail]: to[trail],
    duration: 0.55,
    ease: 'power2.inOut',
    onUpdate: paint,
  });
  gsap.to(state, {
    t: to.t,
    b: to.b,
    duration: 0.35,
    ease: 'power2.out',
    onUpdate: paint,
  });
}
