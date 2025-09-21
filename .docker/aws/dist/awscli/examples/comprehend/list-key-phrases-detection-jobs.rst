**To list all key phrases detection jobs**

The following ``list-key-phrases-detection-jobs`` example lists all in-progress and completed asynchronous key phrases detection jobs. ::

    aws comprehend list-key-phrases-detection-jobs

Output::

    {
        "KeyPhrasesDetectionJobPropertiesList": [
            {
                "JobId": "123456abcdeb0e11022f22a11EXAMPLE",
                "JobArn": "arn:aws:comprehend:us-west-2:111122223333:key-phrases-detection-job/123456abcdeb0e11022f22a11EXAMPLE",
                "JobName": "keyphrasesanalysis1",
                "JobStatus": "COMPLETED",
                "SubmitTime": "2023-06-08T22:31:43.767000+00:00",
                "EndTime": "2023-06-08T22:39:52.565000+00:00",
                "InputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-source-bucket/AsyncBatchJobs/",
                    "InputFormat": "ONE_DOC_PER_LINE"
                },
                "OutputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-destination-bucket/testfolder/111122223333-KP-123456abcdeb0e11022f22a11EXAMPLE/output/output.tar.gz"
                },
                "LanguageCode": "en",
                "DataAccessRoleArn": "arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-example-role"
            },
            {
                "JobId": "123456abcdeb0e11022f22a33EXAMPLE",
                "JobArn": "arn:aws:comprehend:us-west-2:111122223333:key-phrases-detection-job/123456abcdeb0e11022f22a33EXAMPLE",
                "JobName": "keyphrasesanalysis2",
                "JobStatus": "STOPPED",
                "SubmitTime": "2023-06-08T22:57:52.154000+00:00",
                "EndTime": "2023-06-08T23:05:48.385000+00:00",
                "InputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-bucket/AsyncBatchJobs/",
                    "InputFormat": "ONE_DOC_PER_LINE"
                },
                "OutputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-destination-bucket/testfolder/111122223333-KP-123456abcdeb0e11022f22a33EXAMPLE/output/output.tar.gz"
                },
                "LanguageCode": "en",
                "DataAccessRoleArn": "arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-example-role"
            },
            {
                "JobId": "123456abcdeb0e11022f22a44EXAMPLE",
                "JobArn": "arn:aws:comprehend:us-west-2:111122223333:key-phrases-detection-job/123456abcdeb0e11022f22a44EXAMPLE",
                "JobName": "keyphrasesanalysis3",
                "JobStatus": "FAILED",
                "Message": "NO_READ_ACCESS_TO_INPUT: The provided data access role does not have proper access to the input data.",
                "SubmitTime": "2023-06-09T16:47:04.029000+00:00",
                "EndTime": "2023-06-09T16:47:18.413000+00:00",
                "InputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-bucket",
                    "InputFormat": "ONE_DOC_PER_LINE"
                },
                "OutputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-destination-bucket/testfolder/111122223333-KP-123456abcdeb0e11022f22a44EXAMPLE/output/output.tar.gz"
                },
                "LanguageCode": "en",
                "DataAccessRoleArn": "arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-example-role"
            }
        ]
    }

For more information, see `Async analysis for Amazon Comprehend insights <https://docs.aws.amazon.com/comprehend/latest/dg/api-async-insights.html>`__ in the *Amazon Comprehend Developer Guide*.