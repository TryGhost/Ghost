**Example 1: To set an inventory configuration for a bucket**

The following ``put-bucket-inventory-configuration`` example sets a weekly ORC-formatted inventory report for the bucket ``amzn-s3-demo-bucket``. ::

    aws s3api put-bucket-inventory-configuration \
        --bucket amzn-s3-demo-bucket \
        --id 1 \
        --inventory-configuration '{"Destination": { "S3BucketDestination": { "AccountId": "123456789012", "Bucket": "arn:aws:s3:::amzn-s3-demo-bucket", "Format": "ORC" }}, "IsEnabled": true, "Id": "1", "IncludedObjectVersions": "Current", "Schedule": { "Frequency": "Weekly" }}'

This command produces no output.

**Example 2: To set an inventory configuration for a bucket**

The following ``put-bucket-inventory-configuration`` example sets a daily CSV-formatted inventory report for the bucket ``amzn-s3-demo-bucket``. ::

    aws s3api put-bucket-inventory-configuration \
        --bucket amzn-s3-demo-bucket \
        --id 2 \
        --inventory-configuration '{"Destination": { "S3BucketDestination": { "AccountId": "123456789012", "Bucket": "arn:aws:s3:::amzn-s3-demo-bucket", "Format": "CSV" }}, "IsEnabled": true, "Id": "2", "IncludedObjectVersions": "Current", "Schedule": { "Frequency": "Daily" }}'

This command produces no output.
