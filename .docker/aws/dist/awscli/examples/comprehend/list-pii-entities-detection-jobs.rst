**To list all pii entities detection jobs**

The following ``list-pii-entities-detection-jobs`` example lists all in-progress and completed asynchronous pii detection jobs. ::

    aws comprehend list-pii-entities-detection-jobs

Output::

    {
        "PiiEntitiesDetectionJobPropertiesList": [
            {
                "JobId": "6f9db0c42d0c810e814670ee4EXAMPLE",
                "JobArn": "arn:aws:comprehend:us-west-2:111122223333:pii-entities-detection-job/6f9db0c42d0c810e814670ee4EXAMPLE",
                "JobName": "example-pii-detection-job",
                "JobStatus": "COMPLETED",
                "SubmitTime": "2023-06-09T21:02:46.241000+00:00",
                "EndTime": "2023-06-09T21:12:52.602000+00:00",
                "InputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-bucket/AsyncBatchJobs/",
                    "InputFormat": "ONE_DOC_PER_LINE"
                },
                "OutputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-source-bucket/111122223333-PII-6f9db0c42d0c810e814670ee4EXAMPLE/output/"
                },
                "LanguageCode": "en",
                "DataAccessRoleArn": "arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-example-role",
                "Mode": "ONLY_OFFSETS"
            },
            {
                "JobId": "d927562638cfa739331a99b3cEXAMPLE",
                "JobArn": "arn:aws:comprehend:us-west-2:111122223333:pii-entities-detection-job/d927562638cfa739331a99b3cEXAMPLE",
                "JobName": "example-pii-detection-job-2",
                "JobStatus": "COMPLETED",
                "SubmitTime": "2023-06-09T21:20:58.211000+00:00",
                "EndTime": "2023-06-09T21:31:06.027000+00:00",
                "InputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-bucket/AsyncBatchJobs/",
                    "InputFormat": "ONE_DOC_PER_LINE"
                },
                "OutputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-destination-bucket/thefolder/111122223333-PII-d927562638cfa739331a99b3cEXAMPLE/output/"
                },
                "LanguageCode": "en",
                "DataAccessRoleArn": "arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-example-role",
                "Mode": "ONLY_OFFSETS"
            }
        ]
    }

For more information, see `Async analysis for Amazon Comprehend insights <https://docs.aws.amazon.com/comprehend/latest/dg/api-async-insights.html>`__ in the *Amazon Comprehend Developer Guide*.