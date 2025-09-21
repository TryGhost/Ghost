**To retrieve the inventory configuration for a bucket**

The following ``get-bucket-inventory-configuration`` example retrieves the inventory configuration for the specified bucket with ID ``1``. ::

    aws s3api get-bucket-inventory-configuration \
        --bucket amzn-s3-demo-bucket \
        --id 1

Output::

    {
        "InventoryConfiguration": {
            "IsEnabled": true,
            "Destination": {
                "S3BucketDestination": {
                    "Format": "ORC",
                    "Bucket": "arn:aws:s3:::amzn-s3-demo-bucket",
                    "AccountId": "123456789012"
                }
            },
            "IncludedObjectVersions": "Current",
            "Id": "1",
            "Schedule": {
                "Frequency": "Weekly"
            }
        }
    }
