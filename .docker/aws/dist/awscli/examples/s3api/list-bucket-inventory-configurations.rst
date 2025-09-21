**To retrieve a list of inventory configurations for a bucket**

The following ``list-bucket-inventory-configurations`` example lists the inventory configurations for the specified bucket. ::

    aws s3api list-bucket-inventory-configurations \
        --bucket amzn-s3-demo-bucket

Output::

    {
        "InventoryConfigurationList": [
            {
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
            },
            {
                "IsEnabled": true,
                "Destination": {
                    "S3BucketDestination": {
                        "Format": "CSV",
                        "Bucket": "arn:aws:s3:::amzn-s3-demo-bucket",
                        "AccountId": "123456789012"
                    }
                },
                "IncludedObjectVersions": "Current",
                "Id": "2",
                "Schedule": {
                    "Frequency": "Daily"
                }
            }
        ],
        "IsTruncated": false
    }
