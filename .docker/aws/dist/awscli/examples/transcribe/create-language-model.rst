**Example 1: To create a custom language model using both training and tuning data.**

The following ``create-language-model`` example creates a custom language model. You can use a custom language model to improve transcription performance for domains such as legal, hospitality, finance, and insurance. For language-code, enter a valid language code. For base-model-name, specify a base model that is best suited for the sample rate of the audio that you want to transcribe with your custom language model. For model-name, specify the name that you want to call the custom language model. ::

    aws transcribe create-language-model \
        --language-code language-code \
        --base-model-name base-model-name \
        --model-name cli-clm-example \
        --input-data-config S3Uri="s3://amzn-s3-demo-bucket/Amazon-S3-Prefix-for-training-data",TuningDataS3Uri="s3://amzn-s3-demo-bucket/Amazon-S3-Prefix-for-tuning-data",DataAccessRoleArn="arn:aws:iam::AWS-account-number:role/IAM-role-with-permissions-to-create-a-custom-language-model"

Output::

    {
        "LanguageCode": "language-code",
        "BaseModelName": "base-model-name",
        "ModelName": "cli-clm-example",
        "InputDataConfig": {
            "S3Uri": "s3://amzn-s3-demo-bucket/Amazon-S3-Prefix/",
            "TuningDataS3Uri": "s3://amzn-s3-demo-bucket/Amazon-S3-Prefix/",
            "DataAccessRoleArn": "arn:aws:iam::AWS-account-number:role/IAM-role-with-permissions-create-a-custom-language-model"
        },
        "ModelStatus": "IN_PROGRESS"
    }

For more information, see `Improving Domain-Specific Transcription Accuracy with Custom Language Models <https://docs.aws.amazon.com/transcribe/latest/dg/custom-language-models.html>`__ in the *Amazon Transcribe Developer Guide*.

**Example 2: To create a custom language model using only training data.**

The following ``create-language-model`` example transcribes your audio file. You can use a custom language model to improve transcription performance for domains such as legal, hospitality, finance, and insurance. For language-code, enter a valid language code. For base-model-name, specify a base model that is best suited for the sample rate of the audio that you want to transcribe with your custom language model. For model-name, specify the name that you want to call the custom language model. ::

    aws transcribe create-language-model \
        --language-code en-US \
        --base-model-name base-model-name \
        --model-name cli-clm-example \
        --input-data-config S3Uri="s3://amzn-s3-demo-bucket/Amazon-S3-Prefix-For-Training-Data",DataAccessRoleArn="arn:aws:iam::AWS-account-number:role/IAM-role-with-permissions-to-create-a-custom-language-model"

Output::

    {
        "LanguageCode": "en-US",
        "BaseModelName": "base-model-name",
        "ModelName": "cli-clm-example",
        "InputDataConfig": {
            "S3Uri": "s3://amzn-s3-demo-bucket/Amazon-S3-Prefix-For-Training-Data/",
            "DataAccessRoleArn": "arn:aws:iam::your-AWS-account-number:role/IAM-role-with-permissions-to-create-a-custom-language-model"
        },
        "ModelStatus": "IN_PROGRESS"
    }

For more information, see `Improving Domain-Specific Transcription Accuracy with Custom Language Models <https://docs.aws.amazon.com/transcribe/latest/dg/custom-language-models.html>`__ in the *Amazon Transcribe Developer Guide*.