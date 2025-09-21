**To create a medical custom vocabulary**

The following ``create-medical-vocabulary`` example creates a custom vocabulary. To create a custom vocabulary, you must have created a text file with all the terms that you want to transcribe more accurately. For vocabulary-file-uri, specify the Amazon Simple Storage Service (Amazon S3) URI of that text file. For language-code, specify a language code corresponding to the language of your custom vocabulary. For vocabulary-name, specify what you want to call your custom vocabulary. ::

    aws transcribe create-medical-vocabulary \
        --vocabulary-name cli-medical-vocab-example \
        --language-code language-code \
        --vocabulary-file-uri https://amzn-s3-demo-bucket.AWS-Region.amazonaws.com/the-text-file-for-the-medical-custom-vocabulary.txt

Output::

    {
        "VocabularyName": "cli-medical-vocab-example",
        "LanguageCode": "language-code",
        "VocabularyState": "PENDING"
    }

For more information, see `Medical Custom Vocabularies <https://docs.aws.amazon.com/transcribe/latest/dg/how-vocabulary-med.html>`__ in the *Amazon Transcribe Developer Guide*.