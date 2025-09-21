**To list all dominant language detection jobs**

The following ``list-dominant-language-detection-jobs`` example lists all in-progress and completed asynchronous dominant language detection jobs. ::

    aws comprehend list-dominant-language-detection-jobs

Output::

    {
        "DominantLanguageDetectionJobPropertiesList": [
            {
                "JobId": "123456abcdeb0e11022f22a11EXAMPLE",
                "JobArn": "arn:aws:comprehend:us-west-2:111122223333:dominant-language-detection-job/123456abcdeb0e11022f22a11EXAMPLE",
                "JobName": "languageanalysis1",
                "JobStatus": "COMPLETED",
                "SubmitTime": "2023-06-09T18:10:38.037000+00:00",
                "EndTime": "2023-06-09T18:18:45.498000+00:00",
                "InputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-bucket",
                    "InputFormat": "ONE_DOC_PER_LINE"
                },
                "OutputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-destination-bucket/testfolder/111122223333-LANGUAGE-123456abcdeb0e11022f22a11EXAMPLE/output/output.tar.gz"
                },
                "DataAccessRoleArn": "arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-example-role"
            },
            {
                "JobId": "123456abcdeb0e11022f22a11EXAMPLE",
                "JobArn": "arn:aws:comprehend:us-west-2:111122223333:dominant-language-detection-job/123456abcdeb0e11022f22a11EXAMPLE",
                "JobName": "languageanalysis2",
                "JobStatus": "STOPPED",
                "SubmitTime": "2023-06-09T18:16:33.690000+00:00",
                "EndTime": "2023-06-09T18:24:40.608000+00:00",
                "InputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-bucket",
                    "InputFormat": "ONE_DOC_PER_LINE"
                },
                "OutputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-destination-bucket/testfolder/111122223333-LANGUAGE-123456abcdeb0e11022f22a11EXAMPLE/output/output.tar.gz"
                },
                "DataAccessRoleArn": "arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-example-role"
            }
        ]
    }

For more information, see `Async analysis for Amazon Comprehend insights <https://docs.aws.amazon.com/comprehend/latest/dg/api-async-insights.html>`__ in the *Amazon Comprehend Developer Guide*.