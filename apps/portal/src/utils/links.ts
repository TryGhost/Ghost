export const interceptAnchorClicks = (e: MouseEvent): void => {
    if (e.currentTarget && e.currentTarget instanceof Node && e.target instanceof Node) {
        if (e.currentTarget.contains(e.target)) {
            const anchor = e.target instanceof Element ? e.target.closest('a') : null;

            if (anchor) {
                e.preventDefault();
                window.open(anchor.href, '_blank');
            }
        }
    }
};
