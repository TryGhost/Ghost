// copied from mobiledoc-kit as it's not exported

const Browser = {
    isMac() {
        return typeof window !== 'undefined' && window.navigator && /Mac/.test(window.navigator.platform);
    },
    isWin() {
        return typeof window !== 'undefined' && window.navigator && /Win/.test(window.navigator.platform);
    },
    isChrome() {
        return typeof window !== 'undefined' && 'chrome' in window;
    }
};

export default Browser;
