/**
 * Holds the slides a document starts with WAAPI, for app-page-frame.acceptance.test.tsx to step
 * through, in Admin's document and in the app's page (app-page-frame.test-app.tsx) alike.
 */

/**
 * How far a slide starts from where it ends, sideways: by its first keyframe's `translateX(…)`, as
 * Admin's page slides, or by its left margin, as an app's page does. Undefined for other animations.
 */
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

/**
 * Has every slide `view` starts from now on held paused, once the code that started it has set it
 * up, and collects them. Returns a function that stops holding them.
 */
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
