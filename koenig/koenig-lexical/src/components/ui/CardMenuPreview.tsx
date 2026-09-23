// Preview pane on the right of the card menu for the hovered or
// keyboard-selected item, so authors can see what a card will add before they
// insert it. Cards without a dedicated graphic show their icon.
export const CardMenuPreview = ({item}) => {
    if (!item) {
        return null;
    }

    const {Icon} = item;

    return (
        <div
            aria-hidden="true"
            className="pointer-events-none hidden w-[240px] shrink-0 items-center justify-center border-l border-grey-200 p-3 dark:border-grey-900 md:flex"
            data-kg-card-menu-preview={item.label}
        >
            {item.preview === 'before-after' ? (
                <BeforeAfterPreviewGraphic />
            ) : (
                <div className="flex aspect-[16/10] w-full items-center justify-center rounded-md bg-grey-100 text-grey-500 dark:bg-grey-900 dark:text-grey-600">
                    <Icon className="size-10" />
                </div>
            )}
        </div>
    );
};

// The same illustrated "photo" in two treatments. The before layer sits on
// top and is clipped back and forth so the slider appears to reveal the after
// image, which is how the card itself will behave.
const BEFORE_PALETTE = {sky: '#d9dde2', sun: '#f4f5f7', far: '#aab1ba', near: '#838c97', ground: '#6b737d'};
const AFTER_PALETTE = {sky: '#ffb88c', sun: '#fff1c1', far: '#c9658f', near: '#6d3f8f', ground: '#3b2a5c'};

const PreviewScene = ({palette}) => (
    <svg className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 160 100">
        <rect fill={palette.sky} height="100" width="160" />
        <circle cx="112" cy="36" fill={palette.sun} r="13" />
        <path d="M0 70 L34 38 L58 58 L88 30 L126 64 L160 46 V100 H0 Z" fill={palette.far} />
        <path d="M0 82 L40 60 L72 76 L110 56 L160 78 V100 H0 Z" fill={palette.near} />
        <path d="M0 92 Q80 82 160 92 V100 H0 Z" fill={palette.ground} />
    </svg>
);

const BeforeAfterPreviewGraphic = () => (
    <div className="kg-before-after-preview relative aspect-[16/10] w-full overflow-hidden rounded-md">
        <style>{`
            @keyframes kg-before-after-preview-clip {
                from { clip-path: inset(0 70% 0 0); }
                to { clip-path: inset(0 30% 0 0); }
            }
            @keyframes kg-before-after-preview-handle {
                from { left: 30%; }
                to { left: 70%; }
            }
            .kg-before-after-preview [data-layer="before"] {
                clip-path: inset(0 50% 0 0);
                animation: kg-before-after-preview-clip 1.8s cubic-bezier(.65, 0, .35, 1) infinite alternate;
            }
            .kg-before-after-preview [data-layer="handle"] {
                left: 50%;
                animation: kg-before-after-preview-handle 1.8s cubic-bezier(.65, 0, .35, 1) infinite alternate;
            }
            @media (prefers-reduced-motion: reduce) {
                .kg-before-after-preview [data-layer] { animation: none; }
            }
        `}</style>
        <div className="absolute inset-0">
            <PreviewScene palette={AFTER_PALETTE} />
        </div>
        <div className="absolute inset-0" data-layer="before">
            <PreviewScene palette={BEFORE_PALETTE} />
        </div>
        <div className="absolute inset-y-0 w-0" data-layer="handle">
            <div className="absolute inset-y-0 -left-px w-[2px] bg-white shadow-[0_0_4px_rgba(0,0,0,.35)]" />
            <div className="absolute left-0 top-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md">
                <svg className="size-4 text-grey-900" fill="none" viewBox="0 0 16 16">
                    <path d="M6 4 2 8l4 4M10 4l4 4-4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
                </svg>
            </div>
        </div>
    </div>
);
