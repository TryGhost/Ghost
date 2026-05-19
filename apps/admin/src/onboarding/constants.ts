import type React from "react";
import {LucideIcon} from "@tryghost/shade/utils";

type OnboardingStepDefinitionShape = {
    description: string;
    icon: React.ComponentType<{className?: string}>;
    id: string;
    route?: string;
    title: string;
};

export const ONBOARDING_STEPS = [
    {
        description: "Craft a look that reflects your brand and style.",
        icon: LucideIcon.Brush,
        id: "customize-design",
        route: "/settings/design/edit?ref=setup",
        title: "Customize your design",
    },
    {
        description: "Get to know a writing experience you'll love.",
        icon: LucideIcon.PenLine,
        id: "first-post",
        route: "/editor/post",
        title: "Explore the editor",
    },
    {
        description: "Add members and grow your readership.",
        icon: LucideIcon.UserPlus,
        id: "build-audience",
        route: "/members",
        title: "Build your audience",
    },
    {
        description: "Expand your reach on social media.",
        icon: LucideIcon.Megaphone,
        id: "share-publication",
        route: undefined,
        title: "Share your publication",
    },
] as const satisfies readonly OnboardingStepDefinitionShape[];

export type OnboardingStepDefinition = typeof ONBOARDING_STEPS[number];
export type OnboardingStep = OnboardingStepDefinition["id"];
