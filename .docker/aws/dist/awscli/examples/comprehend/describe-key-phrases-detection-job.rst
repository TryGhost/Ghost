**To describe a key phrases detection job**

The following ``describe-key-phrases-detection-job`` example gets the properties of an asynchronous key phrases detection job. ::

    aws comprehend describe-key-phrases-detection-job \
        --job-id 123456abcdeb0e11022f22a11EXAMPLE

Output::

    {
        "KeyPhrasesDetectionJobProperties": {
            "JobId": "69aa080c00fc68934a6a98f10EXAMPLE",
            "JobArn": "arn:aws:comprehend:us-west-2:111122223333:key-phrases-detection-job/69aa080c00fc68934a6a98f10EXAMPLE",
            "JobName": "example-key-phrases-detection-job",
            "JobStatus": "COMPLETED",
            "SubmitTime": 1686606439.177,
            "EndTime": 1686606806.157,
            "InputDataConfig": {
                "S3Uri": "s3://dereksbucket1001/EventsData/",
                "InputFormat": "ONE_DOC_PER_LINE"
            },
            "OutputDataConfig": {
                "S3Uri": "s3://dereksbucket1002/testfolder/111122223333-KP-69aa080c00fc68934a6a98f10EXAMPLE/output/output.tar.gz"
            },
            "LanguageCode": "en",
            "DataAccessRoleArn": "arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-testrole"
        }
    }

For more information, see `Async analysis for Amazon Comprehend insights <https://docs.aws.amazon.com/comprehend/latest/dg/api-async-insights.html>`__ in the *Amazon Comprehend Developer Guide*.