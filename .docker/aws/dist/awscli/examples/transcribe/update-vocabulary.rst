**To update a custom vocabulary with new terms.**

The following ``update-vocabulary`` example overwrites the terms used to create a custom vocabulary with the new ones that you provide. Prerequisite: to replace the terms in a custom vocabulary, you need a file with new terms. ::

    aws transcribe update-vocabulary \
        --vocabulary-file-uri s3://amzn-s3-demo-bucket/Amazon-S3-Prefix/custom-vocabulary.txt \
        --vocabulary-name custom-vocabulary \
        --language-code language-code

Output::

    {
        "VocabularyName": "custom-vocabulary",
        "LanguageCode": "language",
        "VocabularyState": "PENDING"
    }

For more information, see `Custom Vocabularies <https://docs.aws.amazon.com/transcribe/latest/dg/how-vocabulary.html>`__ in the *Amazon Transcribe Developer Guide*.