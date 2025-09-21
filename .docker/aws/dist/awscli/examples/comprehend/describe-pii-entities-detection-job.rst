**To describe a PII entities detection job**

The following ``describe-pii-entities-detection-job`` example gets the properties of an asynchronous pii entities detection job. ::

    aws comprehend describe-pii-entities-detection-job \
        --job-id 123456abcdeb0e11022f22a11EXAMPLE

Output::

    {
        "PiiEntitiesDetectionJobProperties": {
            "JobId": "123456abcdeb0e11022f22a11EXAMPLE",
            "JobArn": "arn:aws:comprehend:us-west-2:111122223333:pii-entities-detection-job/123456abcdeb0e11022f22a11EXAMPLE",
            "JobName": "example-pii-entities-job",
            "JobStatus": "IN_PROGRESS",
            "SubmitTime": "2023-06-08T21:30:15.323000+00:00",
            "EndTime": "2023-06-08T21:40:23.509000+00:00",
            "InputDataConfig": {
                "S3Uri": "s3://amzn-s3-demo-bucket/AsyncBatchJobs/",
                "InputFormat": "ONE_DOC_PER_LINE"
            },
            "OutputDataConfig": {
                "S3Uri": "s3://amzn-s3-demo-bucket/thefolder/111122223333-NER-123456abcdeb0e11022f22a11EXAMPLE/output/output.tar.gz"
            },
            "LanguageCode": "en",
            "DataAccessRoleArn": "arn:aws:iam::12345678012:role/service-role/AmazonComprehendServiceRole-example-role"
        }
    } 

For more information, see `Async analysis for Amazon Comprehend insights <https://docs.aws.amazon.com/comprehend/latest/dg/api-async-insights.html>`__ in the *Amazon Comprehend Developer Guide*.