**To list all events detection jobs**

The following ``list-events-detection-jobs`` example lists all asynchronous events detection jobs. ::

    aws comprehend list-events-detection-jobs

Output::

    {
        "EventsDetectionJobPropertiesList": [
            {
                "JobId": "aa9593f9203e84f3ef032ce18EXAMPLE",
                "JobArn": "arn:aws:comprehend:us-west-2:1111222233333:events-detection-job/aa9593f9203e84f3ef032ce18EXAMPLE",
                "JobName": "events_job_1",
                "JobStatus": "COMPLETED",
                "SubmitTime": "2023-06-12T19:14:57.751000+00:00",
                "EndTime": "2023-06-12T19:21:04.962000+00:00",
                "InputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-source-bucket/EventsData/",
                    "InputFormat": "ONE_DOC_PER_LINE"
                },
                "OutputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-destination-bucket/testfolder/1111222233333-EVENTS-aa9593f9203e84f3ef032ce18EXAMPLE/output/"
                },
                "LanguageCode": "en",
                "DataAccessRoleArn": "arn:aws:iam::1111222233333:role/service-role/AmazonComprehendServiceRole-example-role",
                "TargetEventTypes": [
                    "BANKRUPTCY",
                    "EMPLOYMENT",
                    "CORPORATE_ACQUISITION",
                    "CORPORATE_MERGER",
                    "INVESTMENT_GENERAL"
                ]
            },
            {
                "JobId": "4a990a2f7e82adfca6e171135EXAMPLE",
                "JobArn": "arn:aws:comprehend:us-west-2:1111222233333:events-detection-job/4a990a2f7e82adfca6e171135EXAMPLE",
                "JobName": "events_job_2",
                "JobStatus": "COMPLETED",
                "SubmitTime": "2023-06-12T19:55:43.702000+00:00",
                "EndTime": "2023-06-12T20:03:49.893000+00:00",
                "InputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-source-bucket/EventsData/",
                    "InputFormat": "ONE_DOC_PER_LINE"
                },
                "OutputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-destination-bucket/testfolder/1111222233333-EVENTS-4a990a2f7e82adfca6e171135EXAMPLE/output/"
                },
                "LanguageCode": "en",
                "DataAccessRoleArn": "arn:aws:iam::1111222233333:role/service-role/AmazonComprehendServiceRole-example-role",
                "TargetEventTypes": [
                    "BANKRUPTCY",
                    "EMPLOYMENT",
                    "CORPORATE_ACQUISITION",
                    "CORPORATE_MERGER",
                    "INVESTMENT_GENERAL"
                ]
            }
        ]
    }

For more information, see `Async analysis for Amazon Comprehend insights <https://docs.aws.amazon.com/comprehend/latest/dg/api-async-insights.html>`__ in the *Amazon Comprehend Developer Guide*.