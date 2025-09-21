**To create a canary**

The following ``create-canary`` example creates a canary named ``demo_canary``. ::

    aws synthetics create-canary \
        --name demo_canary \
        --code '{"S3Bucket": "artifacts3bucket", "S3Key":"demo_canary.zip", "Handler": "index.lambda_handler"}' \
        --artifact-s3-location s3://amzn-s3-demo-bucket/demo_canary.zip \
        --execution-role-arn arn:aws:iam::123456789012:role/demo_canary_role \
        --schedule Expression="rate(10 minutes)" \
        --runtime-version syn-nodejs-puppeteer-9.1

Output::

    {
        "Canary": {
            "Id": "a1b2c3d4-5678-90ab-cdef-example11111",
            "Name": "demo_canary",
            "Code": {
                "Handler": "index.lambda_handler"
            },
            "ExecutionRoleArn": "arn:aws:iam::123456789012:role/demo_canary_role",
            "Schedule": {
                "Expression": "rate(10 minutes)",
                "DurationInSeconds": 0
            },
            "RunConfig": {
                "TimeoutInSeconds": 600,
                "MemoryInMB": 1000,
                "ActiveTracing": false
            },
            "SuccessRetentionPeriodInDays": 31,
            "FailureRetentionPeriodInDays": 31,
            "Status": {
                "State": "CREATING",
                "StateReasonCode": "CREATE_PENDING"
            },
            "Timeline": {
                "Created": "2024-10-15T19:03:08.826000+05:30",
                "LastModified": "2024-10-15T19:03:08.826000+05:30"
            },
            "ArtifactS3Location": "amzn-s3-demo-bucket/demo_canary.zip",
            "RuntimeVersion": "syn-nodejs-puppeteer-9.1",
            "Tags": {}
        }
    }

For more information, see `Synthetic monitoring (canaries) <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html>`__ in the *Amazon CloudWatch User Guide*.