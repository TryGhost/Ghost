**To list your custom language models**

The following ``list-language-models`` example lists the custom language models associated with your AWS account and Region. You can use the ``S3Uri`` and ``TuningDataS3Uri`` parameters to find the Amazon S3 prefixes you've used as your training data, or your tuning data. The BaseModelName tells you whether you've used a NarrowBand, or WideBand model to create a custom language model. You can transcribe audio with a sample rate of less than 16 kHz with a custom language model using a NarrowBand base model. You can transcribe audio 16 kHz or greater with a custom language model using a WideBand base model. The ``ModelStatus`` parameter shows whether you can use the custom language model in a transcription job. If the value is COMPLETED, you can use it in a transcription job. ::

    aws transcribe list-language-models

Output::

    {
        "Models": [
            {
                "ModelName": "cli-clm-2",
                "CreateTime": "2020-09-25T17:57:38.504000+00:00",
                "LastModifiedTime": "2020-09-25T17:57:48.585000+00:00",
                "LanguageCode": "language-code",
                "BaseModelName": "WideBand",
                "ModelStatus": "IN_PROGRESS",
                "UpgradeAvailability": false,
                "InputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-bucket/clm-training-data/",
                    "TuningDataS3Uri": "s3://amzn-s3-demo-bucket/clm-tuning-data/",
                    "DataAccessRoleArn": "arn:aws:iam::AWS-account-number:role/IAM-role-used-to-create-the-custom-language-model"
                }
            },
            {
                "ModelName": "cli-clm-1",
                "CreateTime": "2020-09-25T17:16:01.835000+00:00",
                "LastModifiedTime": "2020-09-25T17:16:15.555000+00:00",
                "LanguageCode": "language-code",
                "BaseModelName": "WideBand",
                "ModelStatus": "IN_PROGRESS",
                "UpgradeAvailability": false,
                "InputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-bucket/clm-training-data/",
                    "DataAccessRoleArn": "arn:aws:iam::AWS-account-number:role/IAM-role-used-to-create-the-custom-language-model"
                }
            },
            {
                "ModelName": "clm-console-1",
                "CreateTime": "2020-09-24T19:26:28.076000+00:00",
                "LastModifiedTime": "2020-09-25T04:25:22.271000+00:00",
                "LanguageCode": "language-code",
                "BaseModelName": "NarrowBand",
                "ModelStatus": "COMPLETED",
                "UpgradeAvailability": false,
                "InputDataConfig": {
                    "S3Uri": "s3://amzn-s3-demo-bucket/clm-training-data/",
                    "DataAccessRoleArn": "arn:aws:iam::AWS-account-number:role/IAM-role-used-to-create-the-custom-language-model"
                }
            }
        ]
    }

For more information, see `Improving Domain-Specific Transcription Accuracy with Custom Language Models <https://docs.aws.amazon.com/transcribe/latest/dg/custom-language-models.html>`__ in the *Amazon Transcribe Developer Guide*.