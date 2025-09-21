**To list all targeted sentiment detection jobs**

The following ``list-targeted-sentiment-detection-jobs`` example lists all in-progress and completed asynchronous targeted sentiment detection jobs. ::

    aws comprehend list-targeted-sentiment-detection-jobs

Output::

    {
        "TargetedSentimentDetectionJobPropertiesList": [
            {
                "JobId": "123456abcdeb0e11022f22a11EXAMPLE",
                "JobArn": "arn:aws:comprehend:us-west-2:111122223333:targeted-sentiment-detection-job/123456abcdeb0e11022f22a11EXAMPLE",
                "JobName": "example-targeted-sentiment-detection-job",
                "JobStatus": "COMPLETED",
                "SubmitTime": "2023-06-09T22:42:20.545000+00:00",
                "EndTime": "2023-06-09T22:52:27.416000+00:00",
                "InputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-bucket/MovieData",
                    "InputFormat": "ONE_DOC_PER_LINE"
                },
                "OutputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-destination-bucket/testfolder/111122223333-TS-123456abcdeb0e11022f22a11EXAMPLE/output/output.tar.gz"
                },
                "LanguageCode": "en",
                "DataAccessRoleArn": "arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-IOrole"
            },
            {
                "JobId": "123456abcdeb0e11022f22a1EXAMPLE2",
                "JobArn": "arn:aws:comprehend:us-west-2:111122223333:targeted-sentiment-detection-job/123456abcdeb0e11022f22a1EXAMPLE2",
                "JobName": "example-targeted-sentiment-detection-job-2",
                "JobStatus": "COMPLETED",
                "SubmitTime": "2023-06-09T23:16:15.956000+00:00",
                "EndTime": "2023-06-09T23:26:00.168000+00:00",
                "InputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-bucket/MovieData2",
                    "InputFormat": "ONE_DOC_PER_LINE"
                },
                "OutputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-destination-bucket/testfolder/111122223333-TS-123456abcdeb0e11022f22a1EXAMPLE2/output/output.tar.gz"
                },
                "LanguageCode": "en",
                "DataAccessRoleArn": "arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-example-role"
            }
        ]
    }

For more information, see `Async analysis for Amazon Comprehend insights <https://docs.aws.amazon.com/comprehend/latest/dg/api-async-insights.html>`__ in the *Amazon Comprehend Developer Guide*.