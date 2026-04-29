import {Button} from "@tryghost/shade/components";
import {LucideIcon} from "@tryghost/shade/utils";
import {ONBOARDING_STEPS, type OnboardingStep} from "@/onboarding/constants";
import {OnboardingLogoVideo} from "@/onboarding/components/onboarding-logo-video";
import {OnboardingStepItem} from "@/onboarding/components/onboarding-step-item";

interface OnboardingChecklistProps {
    allStepsCompleted: boolean;
    completedSteps: string[];
    nextStep: OnboardingStep | undefined;
    onComplete: () => void;
    onDismiss: () => void;
    onStepClick: (step: OnboardingStep) => void;
    siteTitle: string;
}

export function OnboardingChecklist({
    allStepsCompleted,
    completedSteps,
    nextStep,
    onComplete,
    onDismiss,
    onStepClick,
    siteTitle,
}: OnboardingChecklistProps) {
    const completedStepSet = new Set(completedSteps);

    return (
        <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-8">
            <section className="mt-[-48px] flex w-full flex-col items-center" data-test-dashboard="onboarding-checklist" data-testid="onboarding-checklist">
                <div className="mb-8 flex flex-col items-center text-center">
                    <OnboardingLogoVideo />
                    {allStepsCompleted ?
                        <h1 className="text-[32px] leading-[1.15] font-bold tracking-normal text-foreground max-[480px]:text-[24px]">You&apos;re all set.</h1>
                        :
                        <>
                            <h1 className="text-[32px] leading-[1.15] font-bold tracking-normal text-foreground max-[480px]:text-[24px]">Let&apos;s get started!</h1>
                            <p className="mt-2 mb-0 text-[15px] text-muted-foreground max-[480px]:m-0 max-[480px]:text-[14px]">Welcome! It&apos;s time to set up {siteTitle}.</p>
                        </>
                    }
                </div>

                <div className="w-full max-w-[540px] rounded-md border border-border bg-background px-6 pt-4 pb-1">
                    <div className={`mt-[-12px] flex items-center justify-between py-6 ${nextStep === "customize-design" ? "border-b-0" : "border-b border-border"}`}>
                        <span className="flex min-w-0 items-center opacity-20">
                            <LucideIcon.Rocket className="mr-4 size-5 shrink-0 text-purple" />
                            <span className="truncate pr-8 text-[16px] leading-[1.3] font-bold text-foreground">Start a new Ghost publication</span>
                        </span>
                        <span className="shrink-0 text-green">
                            <LucideIcon.Check className="size-5" />
                        </span>
                    </div>

                    {ONBOARDING_STEPS.map((step, index) => (
                        <OnboardingStepItem
                            key={step.id}
                            complete={completedStepSet.has(step.id)}
                            id={`ob-${step.id}`}
                            isBeforeNext={ONBOARDING_STEPS[index + 1]?.id === nextStep}
                            isLast={index === ONBOARDING_STEPS.length - 1}
                            isNext={nextStep === step.id}
                            step={step}
                            onClick={() => onStepClick(step.id)}
                        />
                    ))}
                </div>

                {allStepsCompleted &&
                    <Button
                        className="mt-6 h-auto w-full max-w-[540px] px-3 py-3 text-[16px] max-[480px]:text-[15px]"
                        data-testid="onboarding-complete"
                        id="ob-completed"
                        type="button"
                        onClick={onComplete}
                    >
                        Explore your dashboard
                    </Button>
                }

                <p className="mt-8 mb-0 text-[15px] text-muted-foreground max-[480px]:text-[14px]">
                    More questions? Check out our{" "}
                    <Button asChild className="h-auto p-0 align-baseline text-[15px] text-green hover:text-green/90 max-[480px]:text-[14px]" variant="link">
                        <a href="https://ghost.org/help?utm_source=admin&utm_campaign=onboarding" id="ob-help-center" rel="noreferrer" target="_blank">Help Center</a>
                    </Button>.
                </p>

                {!allStepsCompleted &&
                    <Button
                        className="mt-6 h-[38px] overflow-hidden px-3.5 py-px text-[15px] font-normal whitespace-nowrap text-muted-foreground hover:border-gray-300 hover:text-foreground"
                        data-testid="onboarding-skip"
                        id="ob-skip"
                        type="button"
                        variant="outline"
                        onClick={onDismiss}
                    >
                        Skip onboarding
                    </Button>
                }
            </section>
        </main>
    );
}
