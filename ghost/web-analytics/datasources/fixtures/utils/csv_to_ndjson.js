/*
Intended use:
- export csv file from Tinybird Classic workspace, likely using the CLI to get an un-pagingated output
- execute script on csv file
- output is a ndjson file that can be imported using the TB Forward CLI, e.g. `tb datasource append analytics_events ~/dev/output.ndjson`
*/



const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Usage: node csv_to_ndjson.js <input_csv_file> <output_ndjson_file>
const inputFile = process.argv[2];
const outputFile = process.argv[3] || inputFile.replace(/\.csv$/, '_output.ndjson');

if (!inputFile) {
  console.error('Please provide an input CSV file path');
  console.error('Usage: node csv_to_ndjson.js <input_csv_file> [output_ndjson_file]');
  process.exit(1);
}

// Create output directory if it doesn't exist
const outputDir = path.dirname(outputFile);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Function to parse CSV line and handle quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = null;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if ((char === '"' || char === "'") && (!quoteChar || char === quoteChar)) {
      if (inQuotes && i + 1 < line.length && line[i + 1] === char) {
        // Handle escaped quotes
        current += char;
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        if (inQuotes) quoteChar = char;
        else quoteChar = null;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current);
  return result;
}

// Much simpler approach: directly parse the JSON payload field
// by manually extracting key-value pairs and handling the escaping
function parsePayloadField(payloadStr) {
  // Ensure we're working with a clean string - remove outer quotes
  if ((payloadStr.startsWith('"') && payloadStr.endsWith('"')) || 
      (payloadStr.startsWith("'") && payloadStr.endsWith("'"))) {
    payloadStr = payloadStr.substring(1, payloadStr.length - 1);
  }
  
  // Replace double quotes used for escaping in CSV
  payloadStr = payloadStr.replace(/""/g, '"');
  
  // CRITICAL FIX: Target the exact pattern causing empty referrer to be parsed as a comma
  // Replace the empty referrer pattern that gets incorrectly processed
  payloadStr = payloadStr.replace(/"referrer":"",/g, '"referrer":"",');
  // Also fix a specific case where the empty referrer might be caught with a comma
  payloadStr = payloadStr.replace(/"referrer":,/g, '"referrer":"",');
  // Add a direct pattern replacement for the problematic case we're seeing
  payloadStr = payloadStr.replace(/"referrer":"","/, '"referrer":"",');
  
  // Create the payload object manually
  const payload = {};
  
  // Split the payload into key-value pairs
  // First attempt to use JSON parsing directly
  try {
    return JSON.parse(payloadStr);
  } catch (e) {
    // If JSON parsing fails, use a manual approach
    console.log(`Manual parsing needed: ${payloadStr.substring(0, 30)}...`);
    
    // Extract keys and values using regex with specific handling for known fields
    try {
      // Match patterns like "key":"value" handling escaping
      const regex = /"([^"]+)":"([^"]*)"/g;
      let match;
      
      while ((match = regex.exec(payloadStr)) !== null) {
        if (match.length >= 3) {
          const key = match[1];
          let value = match[2];
          
          // Special handling for referrer field - ensure it's not a comma
          if (key === 'referrer' && value === ',') {
            value = '';
          }
          
          // Special handling for URL fields
          if (key === 'href' || key === 'referrer' || key.includes('url')) {
            // Fix broken URLs with escaped backslashes
            value = value.replace(/\\\//g, '/');
            
            // Make sure URLs are properly formatted
            if (value.includes('\\') && !value.includes('\\\\')) {
              value = value.replace(/\\/g, '');
            }
          }
          
          payload[key] = value;
        }
      }
      
      // If we didn't extract any fields, try a different approach for problematic rows
      if (Object.keys(payload).length === 0) {
        // Handle the specific case of broken href field
        if (payloadStr.includes('"href":"\\')) {
          const hrefMatch = payloadStr.match(/"href":"([^,]+),/);
          if (hrefMatch && hrefMatch.length > 1) {
            payload.href = hrefMatch[1].replace(/\\\//g, '/').replace(/^"/, '').replace(/"$/, '');
          }
        }
        
        // Special handling for empty referrer field - make sure it's an empty string, not missing
        if (payloadStr.includes('"referrer":')) {
          // Try to match the referrer field pattern
          const referrerMatch = payloadStr.match(/"referrer":"([^"]*)"/);
          if (referrerMatch) {
            // Explicitly set to empty string for empty fields
            payload.referrer = referrerMatch[1];
          } else {
            // If pattern doesn't match, check if it's an empty quoted field
            if (payloadStr.includes('"referrer":""') || payloadStr.includes('"referrer":"",')) {
              payload.referrer = '';
            }
          }
        } else {
          // No referrer field found at all, set to empty string
          payload.referrer = '';
        }
        
        // Extract other fields
        const fields = [
          'locale', 'location', 'member_status', 'member_uuid', 
          'pathname', 'post_uuid', 'site_uuid', 'user-agent'
        ];
        
        fields.forEach(field => {
          const fieldMatch = payloadStr.match(new RegExp(`"${field}":"([^"]*)"`, 'i'));
          if (fieldMatch && fieldMatch.length > 1) {
            payload[field] = fieldMatch[1];
          }
        });
      }
      
      return payload;
    } catch (regexError) {
      console.error(`Failed to manually parse payload: ${regexError.message}`);
      // Return empty object as fallback
      return {};
    }
  }
}

async function processCSV() {
  const fileStream = fs.createReadStream(inputFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  const outputStream = fs.createWriteStream(outputFile);
  let headers = null;
  let payloadIndex = -1;
  let siteUuidIndex = -1;
  let count = 0;
  let errors = 0;

  for await (const line of rl) {
    if (!headers) {
      // Process headers
      headers = parseCSVLine(line);
      payloadIndex = headers.findIndex(h => h.trim().toLowerCase() === 'payload');
      siteUuidIndex = headers.findIndex(h => h.trim().toLowerCase() === 'site_uuid');
      
      if (payloadIndex === -1) {
        console.error('Error: Could not find "payload" column in CSV');
        process.exit(1);
      }
      
      console.log(`Found payload at index ${payloadIndex}, site_uuid at index ${siteUuidIndex}`);
      continue;
    }
    
    // Parse CSV row
    const values = parseCSVLine(line);
    if (values.length !== headers.length) {
      console.warn(`Warning: Skipping malformed row (expected ${headers.length} columns, got ${values.length})`);
      continue;
    }
    
    // Create object from row
    const obj = {};
    let hasError = false;
    
    // First, extract the site_uuid value if it exists
    let siteUuidValue = '';
    if (siteUuidIndex !== -1) {
      siteUuidValue = values[siteUuidIndex].trim();
      // Remove any surrounding quotes
      siteUuidValue = siteUuidValue.replace(/^["'](.*)["']$/, '$1');
      console.log(`Extracted site_uuid: "${siteUuidValue}"`);
    }
    
    for (let i = 0; i < headers.length; i++) {
      // Skip site_uuid as we'll handle it separately
      if (i === siteUuidIndex) {
        continue;
      }
      
      const header = headers[i].trim();
      let value = values[i].trim();
      
      if (i === payloadIndex) {
        // Use direct manual parsing for payload
        try {
          obj[header] = parsePayloadField(value);
          
          // CRITICAL FIX: Direct post-processing fix for referrer field
          // If the referrer field is still a comma, fix it directly in the object
          if (obj[header] && obj[header].referrer === ',') {
            obj[header].referrer = '';
          }
          
          // Add the site_uuid directly to the payload object
          if (obj[header] && siteUuidValue) {
            obj[header].site_uuid = siteUuidValue;
            console.log(`Set payload.site_uuid to "${siteUuidValue}"`);
          }
          
          // Check if we have a meaningful payload
          if (Object.keys(obj[header]).length === 0) {
            console.warn(`Warning: Empty payload object parsed for row ${count + 1}`);
            hasError = true;
          }
        } catch (e) {
          console.error(`Error parsing payload for row ${count + 1}: ${e.message}`);
          obj[header] = {}; // Use empty object instead of string
          hasError = true;
        }
      } else {
        // For non-payload fields, just use the value
        obj[header] = value;
      }
    }
    
    // Write the row to output
    outputStream.write(JSON.stringify(obj) + '\n');
    count++;
    
    if (hasError) {
      errors++;
    }
  }
  
  outputStream.end();
  console.log(`Successfully converted ${count} rows to NDJSON format at ${outputFile}`);
  if (errors > 0) {
    console.warn(`Warning: ${errors} rows had parsing issues`);
  }
}

processCSV().catch(error => {
  console.error('Error processing CSV:', error);
  process.exit(1);
}); 