**To list all topic detection jobs**

The following ``list-topics-detection-jobs`` example lists all in-progress and completed asynchronous topics detection jobs. ::

    aws comprehend list-topics-detection-jobs

Output::

    {
        "TopicsDetectionJobPropertiesList": [
            {
                "JobId": "123456abcdeb0e11022f22a11EXAMPLE",
                "JobArn": "arn:aws:comprehend:us-west-2:111122223333:topics-detection-job/123456abcdeb0e11022f22a11EXAMPLE",
                "JobName" "topic-analysis-1"
                "JobStatus": "IN_PROGRESS",
                "SubmitTime": "2023-06-09T18:40:35.384000+00:00",
                "EndTime": "2023-06-09T18:46:41.936000+00:00",
                "InputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-bucket",
                    "InputFormat": "ONE_DOC_PER_LINE"
                },
                "OutputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-destination-bucket/thefolder/111122223333-TOPICS-123456abcdeb0e11022f22a11EXAMPLE/output/output.tar.gz"
                },
                "NumberOfTopics": 10,
                "DataAccessRoleArn": "arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-example-role"
            },
            {
                "JobId": "123456abcdeb0e11022f22a1EXAMPLE2",
                "JobArn": "arn:aws:comprehend:us-west-2:111122223333:topics-detection-job/123456abcdeb0e11022f22a1EXAMPLE2",
                "JobName": "topic-analysis-2",
                "JobStatus": "COMPLETED",
                "SubmitTime": "2023-06-09T18:44:43.414000+00:00",
                "EndTime": "2023-06-09T18:50:50.872000+00:00",
                "InputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-bucket",
                    "InputFormat": "ONE_DOC_PER_LINE"
                },
                "OutputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-destination-bucket/thefolder/111122223333-TOPICS-123456abcdeb0e11022f22a1EXAMPLE2/output/output.tar.gz"
                },
                "NumberOfTopics": 10,
                "DataAccessRoleArn": "arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-example-role"
            },
            {
                "JobId": "123456abcdeb0e11022f22a1EXAMPLE3",
                "JobArn": "arn:aws:comprehend:us-west-2:111122223333:topics-detection-job/123456abcdeb0e11022f22a1EXAMPLE3",
                "JobName": "topic-analysis-2",
                "JobStatus": "IN_PROGRESS",
                "SubmitTime": "2023-06-09T18:50:56.737000+00:00",
                "InputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-bucket",
                    "InputFormat": "ONE_DOC_PER_LINE"
                },
                "OutputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-destination-bucket/thefolder/111122223333-TOPICS-123456abcdeb0e11022f22a1EXAMPLE3/output/output.tar.gz"
                },
                "NumberOfTopics": 10,
                "DataAccessRoleArn": "arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-example-role"
            }
        ]
    }

For more information, see `Async analysis for Amazon Comprehend insights <https://docs.aws.amazon.com/comprehend/latest/dg/api-async-insights.html>`__ in the *Amazon Comprehend Developer Guide*.