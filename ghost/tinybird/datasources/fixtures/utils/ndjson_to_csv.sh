#!/usr/bin/env bash

# Check if the correct number of arguments is provided
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <input_ndjson_file> <output_csv_file>"
    exit 1
fi

# Assign input and output file paths from arguments
input_file="$1"
output_file="$2"

# Create the header row
header="timestamp,session_id,action,version,site_uuid,member_uuid,member_status,post_uuid,user-agent,locale,location,referrer,pathname,href"

# Write the header to the output file
echo "$header" > "$output_file"

# Convert NDJSON to CSV and append to the output file
jq -r '
    [
        .timestamp,
        .session_id,
        .action,
        .version,
        (.payload | fromjson | .site_uuid),
        (.payload | fromjson | .member_uuid),
        (.payload | fromjson | .member_status),
        (.payload | fromjson | .post_uuid),
        (.payload | fromjson | .["user-agent"]),
        (.payload | fromjson | .locale),
        (.payload | fromjson | .location),
        (.payload | fromjson | .referrer),
        (.payload | fromjson | .pathname),
        (.payload | fromjson | .href)
    ] | @csv
' "$input_file" >> "$output_file"  # Append to the output file

echo "Conversion complete: $output_file"
