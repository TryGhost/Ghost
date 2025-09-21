**To replace the words in a vocabulary filter**

The following ``update-vocabulary-filter`` example replaces the words in a vocabulary filter with new ones. Prerequisite: To update a vocabulary filter with the new words, you must have those words saved as a text file. ::

    aws transcribe update-vocabulary-filter \
        --vocabulary-filter-file-uri s3://amzn-s3-demo-bucket/Amazon-S3-Prefix/your-text-file-to-update-your-vocabulary-filter.txt \
        --vocabulary-filter-name vocabulary-filter-name

Output::

    {
        "VocabularyFilterName": "vocabulary-filter-name",
        "LanguageCode": "language-code",
        "LastModifiedTime": "2020-09-23T18:40:35.139000+00:00"
    }

For more information, see `Filtering Unwanted Words <https://docs.aws.amazon.com/transcribe/latest/dg/filter-unwanted-words.html>`__ in the *Amazon Transcribe Developer Guide*.