/**
 * A job that simulates an event-driven process.
 * @returns {Object} An object containing the event data.
 */
module.exports = function jobWithEvents() {
    const num1 = Math.floor(Math.random() * 100);
    const num2 = Math.floor(Math.random() * 100);
    const result = num1 + num2;

    return {
        success: true,
        data: {
            result: result
        },
        eventData: {
            events: [{name: 'member.edited', data: {id: '1'}}]
        }
    };
};