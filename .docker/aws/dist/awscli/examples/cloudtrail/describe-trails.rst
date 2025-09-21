**To describe a trail**

The following ``describe-trails`` example returns the settings for ``Trail1`` and ``Trail2``. ::

    aws cloudtrail describe-trails \
        --trail-name-list Trail1 Trail2

Output::

    {
        "trailList": [
            {
                "IncludeGlobalServiceEvents": true, 
                "Name": "Trail1", 
                "TrailARN": "arn:aws:cloudtrail:us-east-1:123456789012:trail/Trail1", 
                "LogFileValidationEnabled": false, 
                "IsMultiRegionTrail": false, 
                "S3BucketName": "amzn-s3-demo-bucket", 
                "CloudWatchLogsRoleArn": "arn:aws:iam::123456789012:role/CloudTrail_CloudWatchLogs_Role", 
                "CloudWatchLogsLogGroupArn": "arn:aws:logs:us-east-1:123456789012:log-group:CloudTrail:*", 
                "SnsTopicName": "my-topic", 
                "HomeRegion": "us-east-1"
            }, 
            {
                "IncludeGlobalServiceEvents": true, 
                "Name": "Trail2", 
                "S3KeyPrefix": "my-prefix", 
                "TrailARN": "arn:aws:cloudtrail:us-east-1:123456789012:trail/Trail2", 
                "LogFileValidationEnabled": false, 
                "IsMultiRegionTrail": false, 
                "S3BucketName": "amzn-s3-demo-bucket2", 
                "KmsKeyId": "arn:aws:kms:us-east-1:123456789012:key/4c5ae5ac-3c13-421e-8335-c7868ef6a769", 
                "HomeRegion": "us-east-1"
            }
        ]
    }
