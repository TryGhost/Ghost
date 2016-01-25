function getModifiedDate(data) {
    var context = data.context ? data.context[0] : null,
        modDate;
    if (data[context]) {
        modDate = data[context].updated_at || null;
        if (modDate) {
            return new Date(modDate).toISOString();
        }
    }
    return null;
}

module.exports = getModifiedDate;
