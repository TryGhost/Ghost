**To create a custom vocabulary**

The following ``create-vocabulary`` example creates a custom vocabulary. To create a custom vocabulary, you must have created a text file with all the terms that you want to transcribe more accurately. For vocabulary-file-uri, specify the Amazon Simple Storage Service (Amazon S3) URI of that text file. For language-code, specify a language code corresponding to the language of your custom vocabulary. For vocabulary-name, specify what you want to call your custom vocabulary. ::

    aws transcribe create-vocabulary \
        --language-code language-code \
        --vocabulary-name cli-vocab-example \
        --vocabulary-file-uri s3://amzn-s3-demo-bucket/Amazon-S3-prefix/the-text-file-for-the-custom-vocabulary.txt

Output::

    {
        "VocabularyName": "cli-vocab-example",
        "LanguageCode": "language-code",
        "VocabularyState": "PENDING"
    }

For more information, see `Custom Vocabularies <https://docs.aws.amazon.com/transcribe/latest/dg/how-vocabulary.html>`__ in the *Amazon Transcribe Developer Guide*.