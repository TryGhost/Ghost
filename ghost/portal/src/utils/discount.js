function calculateDiscount(monthly, yearly) {
    if (isNaN(monthly) || isNaN(yearly)) {
        return 0;
    }

    const discount = monthly ? 100 - Math.floor((yearly / 12 * 100) / monthly) : 0;
    return (discount >= 1 && discount < 100) ? discount : 0;
}

export default calculateDiscount;
