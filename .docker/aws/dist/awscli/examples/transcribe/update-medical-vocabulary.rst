**To update a medical custom vocabulary with new terms.**

The following ``update-medical-vocabulary`` example replaces the terms used in a medical custom vocabulary with the new ones. Prerequisite: to replace the terms in a medical custom vocabulary, you need a file with new terms. ::

    aws transcribe update-medical-vocabulary \
        --vocabulary-file-uri s3://amzn-s3-demo-bucket/Amazon-S3-Prefix/medical-custom-vocabulary.txt \
        --vocabulary-name medical-custom-vocabulary \
        --language-code language

Output::

    {
        "VocabularyName": "medical-custom-vocabulary",
        "LanguageCode": "en-US",
        "VocabularyState": "PENDING"
    }

For more information, see `Medical Custom Vocabularies <https://docs.aws.amazon.com/transcribe/latest/dg/how-vocabulary.html>`__ in the *Amazon Transcribe Developer Guide*.