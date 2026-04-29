import {LucideIcon} from "@tryghost/shade/utils";
import {type OnboardingStepDefinition} from "@/onboarding/constants";

interface OnboardingStepItemProps {
    complete: boolean;
    id: string;
    isBeforeNext: boolean;
    isLast: boolean;
    isNext: boolean;
    onClick: () => void;
    step: OnboardingStepDefinition;
}

export function OnboardingStepItem({
    complete,
    id,
    isBeforeNext,
    isLast,
    isNext,
    onClick,
    step,
}: OnboardingStepItemProps) {
    const Icon = step.icon;
    const hideBorder = isLast || isBeforeNext || isNext;
    const rowClassName = isNext
        ? `relative z-10 -mx-8 flex w-[calc(100%+64px)] items-center justify-between rounded-md bg-background px-8 py-6 text-left shadow-[0_1px_0_rgba(17,17,26,0.05),0_0_8px_rgba(17,17,26,0.10)] transition-none dark:ring-1 dark:ring-border ${isLast ? "-mb-[18px]" : "mb-1.5"}`
        : `relative flex w-full items-center justify-between bg-transparent py-6 text-left ${hideBorder ? "" : "after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border after:content-['']"}`;

    return (
        <button
            className={`group ${rowClassName}`}
            data-testid={`onboarding-step-${step.id}`}
            id={id}
            type="button"
            onClick={onClick}
        >
            <span className={`flex min-w-0 items-center ${complete ? "opacity-20 group-hover:opacity-25" : "group-hover:opacity-90"}`}>
                <Icon className="mr-4 size-5 shrink-0 text-purple" />
                <span className="min-w-0 text-left">
                    <span className="block truncate pr-8 text-[16px] leading-[1.3] font-bold text-foreground">{step.title}</span>
                    {isNext &&
                        <span className="mt-1 block pr-8 text-[15px] leading-[1.4] text-muted-foreground">{step.description}</span>
                    }
                </span>
            </span>
            <span className={`flex shrink-0 items-center transition-transform group-hover:translate-x-[5px] ${complete ? "text-green" : "text-purple"}`}>
                {complete ? <LucideIcon.Check className="size-5" /> : <LucideIcon.ArrowRight className="size-3.5" />}
            </span>
        </button>
    );
}
