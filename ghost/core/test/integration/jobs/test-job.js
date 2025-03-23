module.exports = function testJob() {
    const num1 = Math.floor(Math.random() * 100);
    const num2 = Math.floor(Math.random() * 100);
    const result = num1 + num2;
    
    return result;
};