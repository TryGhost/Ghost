module.exports = function formatCSV(data, fields) {
    let csv = `${fields.join(',')}\r\n`;
    let entry;
    let field;
    let j;
    let i;

    for (j = 0; j < data.length; j = j + 1) {
        entry = data[j];

        for (i = 0; i < fields.length; i = i + 1) {
            field = fields[i];
            csv += (entry[field] !== null && entry[field] !== undefined) ? entry[field] : '';
            if (i !== fields.length - 1) {
                csv += ',';
            }
        }
        csv += '\r\n';
    }

    return csv;
};
