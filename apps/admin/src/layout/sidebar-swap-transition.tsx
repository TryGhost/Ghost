import React from 'react';

const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)';
const PANEL_SELECTOR = '[data-sidebar=sidebar]';
const ROW_SELECTOR =
  '[data-sidebar=header], [data-sidebar=menu-item], [data-sidebar=footer], [data-nav-row]';
const GHOST_ATTRIBUTE = 'data-sidebar-swap-ghost';
const MAX_WAIT_FRAMES = 60;
const OUT_DURATION = 260;
const OUT_TRAVEL = 48;
const IN_DURATION = 300;
const IN_TRAVEL = 24;
const IN_DELAY = 40;
const IN_STAGGER = 18;
const IN_MAX_DELAY = 300;
const REDUCED_DURATION = 150;

interface PanelSnapshot {
  contents: HTMLElement;
  scrollOffsets: Array<[number, number]>;
}

function snapshotPanel(panel: Element): PanelSnapshot {
  const contents = document.createElement('div');
  contents.style.cssText = 'display:flex;flex-direction:column;width:100%;height:100%;';

  for (const child of Array.from(panel.children)) {
    if (!child.hasAttribute(GHOST_ATTRIBUTE)) {
      contents.append(child.cloneNode(true));
    }
  }

  const live = `:scope > :not([${GHOST_ATTRIBUTE}])`;
  const originals = Array.from(panel.querySelectorAll(`${live}, ${live} *`));
  const scrollOffsets: Array<[number, number]> = [];
  originals.forEach((element, index) => {
    if (element.scrollTop > 0) {
      scrollOffsets.push([index, element.scrollTop]);
    }
  });

  return { contents, scrollOffsets };
}

function topLevelRows(panel: Element, ghost: Element | null): HTMLElement[] {
  const rows = Array.from(panel.querySelectorAll<HTMLElement>(ROW_SELECTOR)).filter(
    (row) => !ghost?.contains(row),
  );
  return rows.filter((row) => !row.parentElement?.closest(ROW_SELECTOR));
}

interface SidebarSwapTransitionProps {
  settingsRoute: boolean;
  sidebarRef: React.RefObject<HTMLElement>;
}

export class SidebarSwapTransition extends React.Component<SidebarSwapTransitionProps> {
  private animations: Animation[] = [];
  private ghost: HTMLElement | null = null;
  private frameId: number | undefined;

  getSnapshotBeforeUpdate(prevProps: SidebarSwapTransitionProps): PanelSnapshot | null {
    if (prevProps.settingsRoute === this.props.settingsRoute) {
      return null;
    }

    const panel = this.props.sidebarRef.current?.querySelector(PANEL_SELECTOR);
    return panel ? snapshotPanel(panel) : null;
  }

  componentDidUpdate(
    prevProps: SidebarSwapTransitionProps,
    _prevState: unknown,
    snapshot: PanelSnapshot | null,
  ) {
    if (prevProps.settingsRoute === this.props.settingsRoute) {
      return;
    }

    this.stop();

    const panel = this.props.sidebarRef.current?.querySelector<HTMLElement>(PANEL_SELECTOR);
    if (!panel || !snapshot || typeof panel.animate !== 'function') {
      return;
    }

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const direction = this.props.settingsRoute ? -1 : 1;

    this.playOut(panel, snapshot, direction, reduceMotion);
    this.playIn(panel, direction, reduceMotion);
  }

  componentWillUnmount() {
    this.stop();
  }

  private playOut(
    panel: HTMLElement,
    snapshot: PanelSnapshot,
    direction: number,
    reduceMotion: boolean,
  ) {
    const ghost = document.createElement('div');
    ghost.setAttribute(GHOST_ATTRIBUTE, '');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.inert = true;
    ghost.style.cssText =
      'position:absolute;inset:0;z-index:20;overflow:hidden;pointer-events:none;border-radius:inherit;';
    ghost.append(snapshot.contents);
    panel.append(ghost);
    this.ghost = ghost;

    const clones = snapshot.contents.querySelectorAll(':scope > *, :scope > * *');
    for (const [index, scrollTop] of snapshot.scrollOffsets) {
      const clone = clones[index];
      if (clone) {
        clone.scrollTop = scrollTop;
      }
    }
    ghost.querySelectorAll('[id], [data-testid]').forEach((element) => {
      element.removeAttribute('id');
      element.removeAttribute('data-testid');
    });

    const animation = snapshot.contents.animate(
      reduceMotion
        ? [{ opacity: 1 }, { opacity: 0 }]
        : [
            { opacity: 1, transform: 'none' },
            { opacity: 0, transform: `translateX(${OUT_TRAVEL * direction}px)` },
          ],
      {
        duration: reduceMotion ? REDUCED_DURATION : OUT_DURATION,
        easing: EASE_DRAWER,
        fill: 'forwards',
      },
    );
    this.animations.push(animation);
    void animation.finished
      .then(() => {
        if (this.ghost === ghost) {
          ghost.remove();
          this.ghost = null;
        }
      })
      .catch(() => {});
  }

  private playIn(panel: HTMLElement, direction: number, reduceMotion: boolean) {
    let frames = 0;

    const animateRows = () => {
      const rows = topLevelRows(panel, this.ghost);
      if (rows.length === 0) {
        frames += 1;
        if (frames <= MAX_WAIT_FRAMES) {
          this.frameId = requestAnimationFrame(animateRows);
        }
        return;
      }

      rows.forEach((row, index) => {
        this.animations.push(
          row.animate(
            reduceMotion
              ? [{ opacity: 0 }, { opacity: 1 }]
              : [
                  { opacity: 0, transform: `translateX(${-IN_TRAVEL * direction}px)` },
                  { opacity: 1, transform: 'none' },
                ],
            reduceMotion
              ? { duration: REDUCED_DURATION, easing: 'ease-out' }
              : {
                  duration: IN_DURATION,
                  delay: Math.min(IN_DELAY + index * IN_STAGGER, IN_MAX_DELAY),
                  easing: EASE_OUT,
                  fill: 'backwards',
                },
          ),
        );
      });
    };

    animateRows();
  }

  private stop() {
    if (this.frameId !== undefined) {
      cancelAnimationFrame(this.frameId);
      this.frameId = undefined;
    }
    this.animations.forEach((animation) => animation.cancel());
    this.animations = [];
    this.ghost?.remove();
    this.ghost = null;
  }

  render() {
    return null;
  }
}
