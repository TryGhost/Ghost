**To get information about a specific custom language model**

The following ``describe-language-model`` example gets information about a specific custom language model. For example, under BaseModelName you can see whether your model is trained using a NarrowBand or WideBand model. Custom language models with a NarrowBand base model can transcribe audio with a sample rate less than 16 kHz. Language models using a WideBand base model can transcribe audio with a sample rate greater than 16 kHz. The S3Uri parameter indicates the Amazon S3 prefix you've used to access the training data to create the custom language model. ::

    aws transcribe describe-language-model \
        --model-name cli-clm-example

Output::

    {
        "LanguageModel": {
            "ModelName": "cli-clm-example",
            "CreateTime": "2020-09-25T17:57:38.504000+00:00",
            "LastModifiedTime": "2020-09-25T17:57:48.585000+00:00",
            "LanguageCode": "language-code",
            "BaseModelName": "base-model-name",
            "ModelStatus": "IN_PROGRESS",
            "UpgradeAvailability": false,
            "InputDataConfig": {
                "S3Uri": "s3://amzn-s3-demo-bucket/Amazon-S3-Prefix/",
                "TuningDataS3Uri": "s3://amzn-s3-demo-bucket/Amazon-S3-Prefix/",
                "DataAccessRoleArn": "arn:aws:iam::AWS-account-number:role/IAM-role-with-permissions-to-create-a-custom-language-model"
            }
        }
    }

For more information, see `Improving Domain-Specific Transcription Accuracy with Custom Language Models <https://docs.aws.amazon.com/transcribe/latest/dg/custom-language-models.html>`__ in the *Amazon Transcribe Developer Guide*.