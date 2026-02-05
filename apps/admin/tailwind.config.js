import shadePreset from "@tryghost/shade/tailwind.cjs";
import plugin from "tailwindcss/plugin";

export default {
    presets: [shadePreset(".shade-admin")],
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "../shade/src/**/*.{js,ts,jsx,tsx}",
        "../posts/src/**/*.{js,ts,jsx,tsx}",
        "../stats/src/**/*.{js,ts,jsx,tsx}",
        "../activitypub/src/**/*.{js,ts,jsx,tsx}",
        "../admin-x-settings/src/**/*.{js,ts,jsx,tsx}",
        "../admin-x-design-system/src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            // ActivityPub custom keyframes. Changes here need to be mirrored
            // to the separate ActivityPub config. 
            keyframes: {
                lineExpand: {
                    "0%": {
                        transform: "scaleX(0)",
                        transformOrigin: "right",
                    },
                    "100%": {
                        transform: "scaleX(1)",
                        transformOrigin: "right",
                    },
                },
                scale: {
                    "0%": {
                        transform: "scale(0.8)",
                    },
                    "70%": {
                        transform: "scale(1.1)",
                    },
                    "100%": {
                        transform: "scale(1)",
                    },
                },
            },
            // ActivityPub custom animations. Changes here need to be mirrored
            // to the separate ActivityPub config. 
            animation: {
                "onboarding-handle-bg": "fadeIn 0.2s ease-in 0.5s forwards",
                "onboarding-handle-line":
                    "lineExpand 0.2s ease-in-out 0.7s forwards",
                "onboarding-handle-label": "fadeIn 0.2s ease-in 1.2s forwards",
                "onboarding-next-button": "fadeIn 0.2s ease-in 2s forwards",
                "onboarding-followers":
                    "fadeIn 0.2s ease-in 0.5s forwards, scale 0.3s ease-in 0.5s forwards",
            },
        },
    },
    plugins: [
        // ActivityPub break-anywhere utility. Changes here need to be mirrored
        // to the separate ActivityPub config. 
        plugin(function ({ addUtilities }) {
            addUtilities({
                ".break-anywhere": {
                    "overflow-wrap": "anywhere",
                },
            });
        }),
    ],
};
