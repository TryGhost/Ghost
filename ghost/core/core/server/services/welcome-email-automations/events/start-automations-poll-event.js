module.exports = class StartAutomationsPollEvent {
    /**
     * @param {Date} timestamp
     */
    constructor(timestamp) {
        this.data = null;
        this.timestamp = timestamp;
    }

    /**
     * @returns {StartAutomationsPollEvent}
     */
    static create() {
        return new StartAutomationsPollEvent(new Date());
    }
};
