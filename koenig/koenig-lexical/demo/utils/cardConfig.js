export const cardConfig = getCardConfig();
function getCardConfig() {
    let config = {};
    if (import.meta.env.VITE_CARD_CONFIG) {
        config = JSON.parse(import.meta.env.VITE_CARD_CONFIG);
    }

    return config;
}
