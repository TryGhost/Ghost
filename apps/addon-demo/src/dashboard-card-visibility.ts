import type {GhostBridge} from '@tryghost/addon-kit/addon';

/**
 * The card's paired should-render module: the card stays hidden for
 * implausibly short analytics ranges (a trivial rule, but it proves the
 * conditional-visibility loop end to end).
 */
export default (ghost: GhostBridge) => {
    const range = Number(ghost.data.context.range ?? 0);
    return range !== 1;
};
