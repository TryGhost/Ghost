import CloseIcon from '../../assets/icons/kg-close.svg?react';

interface PublicPreviewSuggestionProps {
    contentWidth: number;
    isVisible: boolean;
    onAdd: () => void;
    onDismiss: () => void;
}

export function PublicPreviewSuggestion({
    contentWidth,
    isVisible,
    onAdd,
    onDismiss
}: PublicPreviewSuggestionProps) {
    const transitionClass = `transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transform-none motion-reduce:transition-opacity ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'}`;
    const jaggedPoints = (() => {
        const horizontalSteps = [5, 8, 6, 9, 7, 5, 10, 6];
        const verticalPoints = [6.5, 1.5, 7, 2.5, 5.5, 1, 6, 2];
        const points = [];
        let x = 0;
        let index = 0;

        while (x <= contentWidth) {
            points.push(`${x},${verticalPoints[index % verticalPoints.length]}`);
            x += horizontalSteps[index % horizontalSteps.length];
            index += 1;
        }

        points.push(`${contentWidth},${verticalPoints[index % verticalPoints.length]}`);
        return points.join(' ');
    })();

    return (
        <div
            aria-atomic="true"
            className={`not-kg-prose pointer-events-auto relative w-full rounded-[10px] border border-dashed border-grey-300 bg-white p-1.5 font-sans text-sm leading-snug text-grey-700 shadow-xs dark:border-grey-700 dark:bg-grey-950 dark:text-grey-400 ${transitionClass}`}
            data-kg-allow-clickthrough="true"
            data-kg-public-preview-suggestion="true"
            role="status"
        >
            <span aria-hidden="true" className="pointer-events-none absolute right-full top-1/2 w-4 -translate-y-1/2 border-t border-dashed border-grey-300 dark:border-grey-700">
                <svg
                    className="absolute right-full top-1/2 h-2 max-w-none -translate-y-1/2 overflow-visible text-grey-300 dark:text-grey-700"
                    preserveAspectRatio="none"
                    style={{width: `${contentWidth}px`}}
                    viewBox={`0 0 ${contentWidth} 8`}
                >
                    <polyline fill="none" points={jaggedPoints} stroke="currentColor" strokeDasharray="3 3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
                </svg>
            </span>
            <div className="flex items-center gap-1.5">
                <button
                    className="min-h-[32px] whitespace-nowrap rounded bg-black px-3 py-1.5 font-semibold text-white hover:bg-grey-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green focus-visible:ring-offset-2 dark:bg-white dark:text-black dark:hover:bg-grey-200 dark:focus-visible:ring-offset-black"
                    data-kg-public-preview-suggestion-add="true"
                    type="button"
                    onClick={onAdd}
                >
                    Add a paywall
                </button>
                <button
                    aria-label="Dismiss public preview suggestion"
                    className="flex size-8 shrink-0 items-center justify-center rounded border border-grey-300 text-grey-600 hover:border-grey-400 hover:bg-grey-100 hover:text-grey-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green dark:border-grey-700 dark:text-grey-500 dark:hover:border-grey-600 dark:hover:bg-grey-900 dark:hover:text-grey-200"
                    type="button"
                    onClick={onDismiss}
                >
                    <CloseIcon aria-hidden="true" className="size-3.5 stroke-2" />
                </button>
            </div>
        </div>
    );
}
