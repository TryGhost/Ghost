**To get information about a vocabulary filter**

The following ``get-vocabulary-filter`` example gets information about a vocabulary filter. You can use the DownloadUri parameter to get the list of words you used to create the vocabulary filter. ::

    aws transcribe get-vocabulary-filter \
        --vocabulary-filter-name testFilter

Output::

    {
        "VocabularyFilterName": "testFilter",
        "LanguageCode": "language-code",
        "LastModifiedTime": "2020-05-07T22:39:32.147000+00:00",
        "DownloadUri": "https://Amazon-S3-location-to-download-your-vocabulary-filter"
    }

For more information, see `Filter Unwanted Words <https://docs.aws.amazon.com/transcribe/latest/dg/how-vocabulary.html>`__ in the *Amazon Transcribe Developer Guide*.