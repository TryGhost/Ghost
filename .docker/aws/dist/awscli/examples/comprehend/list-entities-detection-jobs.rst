**To list all entities detection jobs**

The following ``list-entities-detection-jobs`` example lists all asynchronous entities detection jobs. ::

    aws comprehend list-entities-detection-jobs

Output::

    {
        "EntitiesDetectionJobPropertiesList": [
            {
                "JobId": "468af39c28ab45b83eb0c4ab9EXAMPLE",
                "JobArn": "arn:aws:comprehend:us-west-2:111122223333:entities-detection-job/468af39c28ab45b83eb0c4ab9EXAMPLE",
                "JobName": "example-entities-detection",
                "JobStatus": "COMPLETED",
                "SubmitTime": "2023-06-08T20:57:46.476000+00:00",
                "EndTime": "2023-06-08T21:05:53.718000+00:00",
                "InputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-bucket/AsyncBatchJobs/",
                    "InputFormat": "ONE_DOC_PER_LINE"
                },
                "OutputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-destination-bucket/thefolder/111122223333-NER-468af39c28ab45b83eb0c4ab9EXAMPLE/output/output.tar.gz"
                },
                "LanguageCode": "en",
                "DataAccessRoleArn": "arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-example-role"
            },
            {
                "JobId": "809691caeaab0e71406f80a28EXAMPLE",
                "JobArn": "arn:aws:comprehend:us-west-2:111122223333:entities-detection-job/809691caeaab0e71406f80a28EXAMPLE",
                "JobName": "example-entities-detection-2",
                "JobStatus": "COMPLETED",
                "SubmitTime": "2023-06-08T21:30:15.323000+00:00",
                "EndTime": "2023-06-08T21:40:23.509000+00:00",
                "InputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-bucket/AsyncBatchJobs/",
                    "InputFormat": "ONE_DOC_PER_LINE"
                },
                "OutputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-destination-bucket/thefolder/111122223333-NER-809691caeaab0e71406f80a28EXAMPLE/output/output.tar.gz"
                },
                "LanguageCode": "en",
                "DataAccessRoleArn": "arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-example-role"
            },
            {
                "JobId": "e00597c36b448b91d70dea165EXAMPLE",
                "JobArn": "arn:aws:comprehend:us-west-2:111122223333:entities-detection-job/e00597c36b448b91d70dea165EXAMPLE",
                "JobName": "example-entities-detection-3",
                "JobStatus": "STOPPED",
                "SubmitTime": "2023-06-08T22:19:28.528000+00:00",
                "EndTime": "2023-06-08T22:27:33.991000+00:00",
                "InputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-bucket/AsyncBatchJobs/",
                    "InputFormat": "ONE_DOC_PER_LINE"
                },
                "OutputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-destination-bucket/thefolder/111122223333-NER-e00597c36b448b91d70dea165EXAMPLE/output/output.tar.gz"
                },
                "LanguageCode": "en",
                "DataAccessRoleArn": "arn:aws:iam::111122223333:role/service-role/AmazonComprehendServiceRole-example-role"
            }
        ]
    }

For more information, see `Entities <https://docs.aws.amazon.com/comprehend/latest/dg/how-entities.html>`__ in the *Amazon Comprehend Developer Guide*.