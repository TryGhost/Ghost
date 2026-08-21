//@ts-check
const { Transform } = require('stream');
const { serialize: serializeCSV } = require('../../../../../services/members/import-export/csv');
// The export CSV row shape and its encode live in the domain (typed against the export
// row) rather than here, so a change to the export row is caught by the compiler.
const { toExportCsvRow } = require('../../../../../services/members/import-export/export/exporter');

/**
 * Create a CSV Transform stream
 *
 * Pipe a `Readable` of member objects in, pipe CSV string out. Extracted from
 * the members output serializer so the site export orchestrator can reuse it.
 *
 * @returns {Transform} Transform stream that converts objects to CSV
 */
function createCSVTransform() {
  // Locked in from the first row rather than declared up front: custom fields
  // add a column per site, so the column set isn't known until a row arrives.
  // Every row carries the same keys, so the first is representative.
  let fields = null;

  return new Transform({
    objectMode: true,
    transform(member, encoding, callback) {
      try {
        // Format the member data for CSV
        const formattedMember = toExportCsvRow(member);

        // For first chunk, include the headers
        if (fields === null) {
          fields = Object.keys(formattedMember);
          const csv = serializeCSV([formattedMember], { columns: fields, header: true });
          callback(null, csv);
        } else {
          // For subsequent chunks, don't include headers, just the data
          const csv = serializeCSV([formattedMember], { columns: fields, header: false });

          // Make sure each row starts with a newline to ensure separation between rows
          // Ensure consistent line endings by using explicit CR+LF sequence
          callback(null, '\r\n' + csv.replace(/^\r?\n+/, ''));
        }
      } catch (err) {
        callback(err);
      }
    },
  });
}

module.exports = {
  createCSVTransform,
};
