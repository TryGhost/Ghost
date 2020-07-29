function calculateDiscount(monthly, yearly) {
    if (isNaN(monthly) || isNaN(yearly)) { 
        return 0; 
    }
    
    return monthly ? 100 - Math.round((yearly / 12 * 100) / monthly) : 0;
}

module.exports = calculateDiscount;