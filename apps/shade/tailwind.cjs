// eslint-disable-next-line @typescript-eslint/no-var-requires
const config = require('./tailwind.config');

module.exports = selector => ({
    ...config,

    // Add app src content here to force TailwindCSS scan them when building classes
    appsContent: [
        '../posts/src/**/*.{js,ts,jsx,tsx}',
        '../stats/src/**/*.{js,ts,jsx,tsx}',
        '../admin-x-activitypub/src/**/*.{js,ts,jsx,tsx}'
    ],
    important: selector
});
