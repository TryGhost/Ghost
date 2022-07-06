export function getBundledCssLink({appVersion}) {
    if (process.env.NODE_ENV === 'production' && appVersion) {
        return `https://unpkg.com/@tryghost/sodo-search@~${appVersion}/umd/main.css`;
    } else {
        return 'http://localhost:3000/main.css';
    }
}
