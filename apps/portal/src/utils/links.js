export const interceptAnchorClicks = (e) => {
    if (e.currentTarget.contains(e.target)) {
        const anchor = e.target.closest('a');

        if (anchor) {
            e.preventDefault();
            window.open(anchor.href, '_blank');
        }
    }
};
