**To get information about a custom vocabulary**

The following ``get-vocabulary`` example gets information on a previously created custom vocabulary. ::

    aws transcribe get-vocabulary \
        --vocabulary-name cli-vocab-1

Output::

    {
        "VocabularyName": "cli-vocab-1",
        "LanguageCode": "language-code",
        "VocabularyState": "READY",
        "LastModifiedTime": "2020-09-19T23:22:32.836000+00:00",
        "DownloadUri": "https://link-to-download-the-text-file-used-to-create-your-custom-vocabulary"
    }

For more information, see `Custom Vocabularies <https://docs.aws.amazon.com/transcribe/latest/dg/how-vocabulary.html>`__ in the *Amazon Transcribe Developer Guide*.