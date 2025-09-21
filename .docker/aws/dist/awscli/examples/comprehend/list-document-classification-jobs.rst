**To list of all document classification jobs**

The following ``list-document-classification-jobs`` example lists all document classification jobs. ::

    aws comprehend list-document-classification-jobs

Output::

    {
        "DocumentClassificationJobPropertiesList": [
            {
                "JobId": "123456abcdeb0e11022f22a11EXAMPLE",
                "JobArn": "arn:aws:comprehend:us-west-2:1234567890101:document-classification-job/123456abcdeb0e11022f22a11EXAMPLE",
                "JobName": "exampleclassificationjob",
                "JobStatus": "COMPLETED",
                "SubmitTime": "2023-06-14T17:09:51.788000+00:00",
                "EndTime": "2023-06-14T17:15:58.582000+00:00",
                "DocumentClassifierArn": "arn:aws:comprehend:us-west-2:1234567890101:document-classifier/mymodel/version/12",
                "InputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-bucket/jobdata/",
                    "InputFormat": "ONE_DOC_PER_LINE"
                },
                "OutputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-destination-bucket/thefolder/1234567890101-CLN-e758dd56b824aa717ceab551f11749fb/output/output.tar.gz"
                },
                "DataAccessRoleArn": "arn:aws:iam::1234567890101:role/service-role/AmazonComprehendServiceRole-example-role"
            },
            {
                "JobId": "123456abcdeb0e11022f22a1EXAMPLE2",
                "JobArn": "arn:aws:comprehend:us-west-2:1234567890101:document-classification-job/123456abcdeb0e11022f22a1EXAMPLE2",
                "JobName": "exampleclassificationjob2",
                "JobStatus": "COMPLETED",
                "SubmitTime": "2023-06-14T17:22:39.829000+00:00",
                "EndTime": "2023-06-14T17:28:46.107000+00:00",
                "DocumentClassifierArn": "arn:aws:comprehend:us-west-2:1234567890101:document-classifier/mymodel/version/12",
                "InputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-bucket/jobdata/",
                    "InputFormat": "ONE_DOC_PER_LINE"
                },
                "OutputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-destination-bucket/thefolder/1234567890101-CLN-123456abcdeb0e11022f22a1EXAMPLE2/output/output.tar.gz"
                },
                "DataAccessRoleArn": "arn:aws:iam::1234567890101:role/service-role/AmazonComprehendServiceRole-example-role"
            }
        ]
    }

For more information, see `Custom Classification <https://docs.aws.amazon.com/comprehend/latest/dg/how-document-classification.html>`__ in the *Amazon Comprehend Developer Guide*.