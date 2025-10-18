import shadePreset from "@tryghost/shade/tailwind.cjs";

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
    ],
};
