**To describe a dominant language detection detection job.**

The following ``describe-dominant-language-detection-job`` example gets the properties of an asynchronous dominant language detection job. ::

    aws comprehend describe-dominant-language-detection-job \
        --job-id 123456abcdeb0e11022f22a11EXAMPLE

Output::

    {
        "DominantLanguageDetectionJobProperties": {
            "JobId": "123456abcdeb0e11022f22a11EXAMPLE",
            "JobArn": "arn:aws:comprehend:us-west-2:111122223333:dominant-language-detection-job/123456abcdeb0e11022f22a11EXAMPLE",
            "JobName": "languageanalysis1",
            "JobStatus": "IN_PROGRESS",
            "SubmitTime": "2023-06-09T18:10:38.037000+00:00",
            "InputDataConfig": {
                "S3Uri": "s3://amzn-s3-demo-bucket",
                "InputFormat": "ONE_DOC_PER_LINE"
            },
            "OutputDataConfig": {
                "S3Uri": "s3://amzn-s3-demo-destination-bucket/testfolder/111122223333-LANGUAGE-123456abcdeb0e11022f22a11EXAMPLE/output/output.tar.gz"
            },
            "DataAccessRoleArn": "arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-example-role"
        }
    }

For more information, see `Async analysis for Amazon Comprehend insights <https://docs.aws.amazon.com/comprehend/latest/dg/api-async-insights.html>`__ in the *Amazon Comprehend Developer Guide*.
