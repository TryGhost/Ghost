**To list your vocabulary filters**

The following ``list-vocabulary-filters`` example lists the vocabulary filters associated with your AWS account and Region. ::

    aws transcribe list-vocabulary-filters

Output::

    {
        "NextToken": "NextToken": [
            {
                "VocabularyFilterName": "testFilter",
                "LanguageCode": "language-code",
                "LastModifiedTime": "2020-05-07T22:39:32.147000+00:00"
            },
            {
                "VocabularyFilterName": "testFilter2",
                "LanguageCode": "language-code",
                "LastModifiedTime": "2020-05-21T23:29:35.174000+00:00"
            },
            {
                "VocabularyFilterName": "filter2",
                "LanguageCode": "language-code",
                "LastModifiedTime": "2020-05-08T20:18:26.426000+00:00"
            },
            {
                "VocabularyFilterName": "filter-review",
                "LanguageCode": "language-code",
                "LastModifiedTime": "2020-06-03T18:52:30.448000+00:00"
            },
            {
                "VocabularyFilterName": "crlf-filt",
                "LanguageCode": "language-code",
                "LastModifiedTime": "2020-05-22T19:42:42.737000+00:00"
            }
        ]
    }

For more information, see `Filtering Unwanted Words <https://docs.aws.amazon.com/transcribe/latest/dg/filter-unwanted-words.html>`__ in the *Amazon Transcribe Developer Guide*.