**To describe a sentiment detection job**

The following ``describe-sentiment-detection-job`` example gets the properties of an asynchronous sentiment detection job. ::

    aws comprehend describe-sentiment-detection-job \
        --job-id 123456abcdeb0e11022f22a11EXAMPLE

Output::

    {
        "SentimentDetectionJobProperties": {
            "JobId": "123456abcdeb0e11022f22a11EXAMPLE",
            "JobArn": "arn:aws:comprehend:us-west-2:111122223333:sentiment-detection-job/123456abcdeb0e11022f22a11EXAMPLE",
            "JobName": "movie_review_analysis",
            "JobStatus": "IN_PROGRESS",
            "SubmitTime": "2023-06-09T23:16:15.956000+00:00",
            "InputDataConfig": {
                "S3Uri": "s3://amzn-s3-demo-bucket/MovieData",
                "InputFormat": "ONE_DOC_PER_LINE"
            },
            "OutputDataConfig": {
                "S3Uri": "s3://amzn-s3-demo-destination-bucket/testfolder/111122223333-TS-123456abcdeb0e11022f22a11EXAMPLE/output/output.tar.gz"
            },
            "LanguageCode": "en",
            "DataAccessRoleArn": "arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-servicerole"
        }
    }

For more information, see `Async analysis for Amazon Comprehend insights <https://docs.aws.amazon.com/comprehend/latest/dg/api-async-insights.html>`__ in the *Amazon Comprehend Developer Guide*.