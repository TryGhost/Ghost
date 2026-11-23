// Pauses the WAAPI slides Admin or an app's page starts, so the spec can step through them.

/** How far a slide starts from where it ends: by `translateX` for Admin, left margin for apps. */
export function slideOffset(animation: Animation): number | undefined {
  const keyframes = (animation.effect as KeyframeEffect | null)?.getKeyframes() ?? [];
  const [first, last] = [keyframes[0], keyframes.at(-1)];
  const translate = /^translateX\((-?[\d.]+)px\)$/.exec(String(first?.transform ?? ''));
  if (translate) {
    return Number(translate[1]);
  }
  if (typeof first?.marginLeft === 'string' && typeof last?.marginLeft === 'string') {
    return parseFloat(first.marginLeft) - parseFloat(last.marginLeft);
  }
  return undefined;
}

/** Collects every slide `view` starts from now on, paused once its caller has set it up. */
export function holdSlides(view: Window & typeof globalThis, held: Animation[]) {
  const { prototype } = view.Element;
  const animate = Object.getOwnPropertyDescriptor(prototype, 'animate')!;
  prototype.animate = function (this: Element, ...args) {
    const animation = (animate.value as Element['animate']).apply(this, args);
    if (slideOffset(animation) !== undefined) {
      held.push(animation);
      queueMicrotask(() => animation.pause());
    }
    return animation;
  };
  return () => {
    Object.defineProperty(prototype, 'animate', animate);
  };
}
