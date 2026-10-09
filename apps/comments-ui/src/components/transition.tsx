import { type MutableRef, useContext, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { createContext } from 'preact';
import type { ComponentChildren } from 'preact';

type TransitionProps = {
  show?: boolean;
  appear?: boolean;
  className?: string;
  enter?: string;
  enterFrom?: string;
  enterTo?: string;
  leave?: string;
  leaveFrom?: string;
  leaveTo?: string;
  children: ComponentChildren;
  'data-testid'?: string;
};

type TransitionContextValue = {
  show: boolean;
  leavingChildren: Set<Promise<void>>;
};

const TransitionContext = createContext<TransitionContextValue | undefined>(undefined);

const classList = (classes = '') => classes.split(' ').filter(Boolean);

function longestTime(value: string) {
  return Math.max(
    0,
    ...value
      .split(',')
      .map((time) => (time.includes('ms') ? parseFloat(time) : parseFloat(time) * 1000))
      .filter((time) => !isNaN(time)),
  );
}

function applyClasses(
  element: HTMLElement,
  activeClasses: MutableRef<string[]>,
  classes: string[],
) {
  element.classList.remove(...activeClasses.current);
  element.classList.add(...classes);
  activeClasses.current = classes;
  if (!element.classList.length) {
    element.removeAttribute('class');
  }
}

function runTransition(
  element: HTMLElement,
  activeClasses: MutableRef<string[]>,
  [base, from, to]: [string[], string[], string[]],
  done: () => void,
) {
  let frame = 0;
  let timeout = 0;
  let finished = false;

  const finish = (event?: TransitionEvent) => {
    if (finished || (event && event.target !== element)) {
      return;
    }
    finished = true;
    done();
  };

  applyClasses(element, activeClasses, [...base, ...from]);

  frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(() => {
      applyClasses(element, activeClasses, [...base, ...to]);

      const { transitionDuration, transitionDelay } = getComputedStyle(element);
      const duration = longestTime(transitionDuration) + longestTime(transitionDelay);
      if (duration === 0) {
        finish();
        return;
      }
      element.addEventListener('transitionend', finish);
      timeout = window.setTimeout(finish, duration);
    });
  });

  return () => {
    cancelAnimationFrame(frame);
    clearTimeout(timeout);
    element.removeEventListener('transitionend', finish);
  };
}

/**
 * Animates its wrapper div in and out with Tailwind classes and unmounts it once its own
 * and any nested Transition's leave transition has ended. Without a `show` prop it follows
 * the closest parent Transition, and leaves the page together with it.
 */
export function Transition({
  show: showProp,
  appear = false,
  className,
  enter,
  enterFrom,
  enterTo,
  leave,
  leaveFrom,
  leaveTo,
  children,
  ...rest
}: TransitionProps) {
  const parent = useContext(TransitionContext);
  const show = showProp ?? parent?.show ?? true;
  const [hidden, setHidden] = useState(!show);
  const [leavingChildren] = useState(() => new Set<Promise<void>>());
  const element = useRef<HTMLDivElement>(null);
  const activeClasses = useRef<string[]>([]);
  const isInitialRender = useRef(true);

  // Render the enter start state with the element, so it is never painted without it
  if (show && (hidden || (isInitialRender.current && appear))) {
    activeClasses.current = [...classList(enter), ...classList(enterFrom)];
  }

  useLayoutEffect(() => {
    const skipEnter = isInitialRender.current && !appear;
    isInitialRender.current = false;

    if (!element.current) {
      return;
    }

    if (show) {
      setHidden(false);
      if (skipEnter) {
        return;
      }
      const entering = element.current;
      return runTransition(
        entering,
        activeClasses,
        [classList(enter), classList(enterFrom), classList(enterTo)],
        () => applyClasses(entering, activeClasses, []),
      );
    }

    let cancelled = false;
    let markLeft = () => {};
    const left = new Promise<void>((resolve) => {
      markLeft = resolve;
    });
    parent?.leavingChildren.add(left);

    const cancelTransition = runTransition(
      element.current,
      activeClasses,
      [classList(leave), classList(leaveFrom), classList(leaveTo)],
      () => {
        void Promise.all(leavingChildren).then(() => {
          if (cancelled) {
            return;
          }
          // A leaving parent unmounts this element along with itself
          if (!parent || parent.show) {
            setHidden(true);
          }
          markLeft();
        });
      },
    );

    return () => {
      cancelled = true;
      cancelTransition();
      parent?.leavingChildren.delete(left);
      markLeft();
    };
  }, [show]);

  if (!show && hidden) {
    return null;
  }

  return (
    <TransitionContext.Provider value={{ show, leavingChildren }}>
      <div
        ref={element}
        className={[className, ...activeClasses.current].filter(Boolean).join(' ') || undefined}
        {...rest}
      >
        {children}
      </div>
    </TransitionContext.Provider>
  );
}
