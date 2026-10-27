import TransistorIcon from '../../../assets/icons/kg-card-type-transistor.svg?react';

interface TransistorCardProps {
    accentColor?: string;
    backgroundColor?: string;
}

export function TransistorCard({
    accentColor: _accentColor = '',
    backgroundColor: _backgroundColor = ''
}: TransistorCardProps) {
    return (
        <div className="w-full rounded-lg border border-grey-300 bg-white dark:border-grey-900 dark:bg-grey-950">
            <TransistorPlaceholder />
        </div>
    );
}

function TransistorPlaceholder() {
    return (
        <div
            className="relative flex flex-col items-center gap-6 px-6 py-8"
            data-testid="transistor-placeholder"
        >
            <div className="size-22 flex shrink-0 items-center justify-center rounded-xl bg-accent">
                <TransistorIcon className="size-12 text-white" />
            </div>
            <div className="min-h-22 flex max-w-[480px] flex-col justify-center">
                <div className="text-center text-[2.1rem] font-semibold leading-[-0.08px] text-black dark:text-white">
                    Members-only podcasts
                </div>
                <div className="mt-3 text-center text-[1.4rem] leading-normal text-grey-700 dark:text-grey-500">
                    Your Transistor podcasts will appear here. Members will see subscribe links based on their access level.
                </div>
            </div>
        </div>
    );
}
