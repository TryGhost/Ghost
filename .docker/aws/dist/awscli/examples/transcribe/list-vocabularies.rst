**To list your custom vocabularies**

The following ``list-vocabularies`` example lists the custom vocabularies associated with your AWS account and Region. ::

    aws transcribe list-vocabularies

Output::

    {
        "NextToken": "NextToken",
        "Vocabularies": [
            {
                "VocabularyName": "ards-test-1",
                "LanguageCode": "language-code",
                "LastModifiedTime": "2020-04-27T22:00:27.330000+00:00",
                "VocabularyState": "READY"
            },
            {
                "VocabularyName": "sample-test",
                "LanguageCode": "language-code",
                "LastModifiedTime": "2020-04-24T23:04:11.044000+00:00",
                "VocabularyState": "READY"
            },
            {
                "VocabularyName": "CRLF-to-LF-test-3-1",
                "LanguageCode": "language-code",
                "LastModifiedTime": "2020-04-24T22:12:22.277000+00:00",
                "VocabularyState": "READY"
            },
            {
                "VocabularyName": "CRLF-to-LF-test-2",
                "LanguageCode": "language-code",
                "LastModifiedTime": "2020-04-24T21:53:50.455000+00:00",
                "VocabularyState": "READY"
            },
            {
                "VocabularyName": "CRLF-to-LF-1-1",
                "LanguageCode": "language-code",
                "LastModifiedTime": "2020-04-24T21:39:33.356000+00:00",
                "VocabularyState": "READY"
            }
        ]
    }

For more information, see `Custom Vocabularies <https://docs.aws.amazon.com/transcribe/latest/dg/how-vocabulary.html>`__ in the *Amazon Transcribe Developer Guide*.