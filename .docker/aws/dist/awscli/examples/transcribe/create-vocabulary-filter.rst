**To create a vocabulary filter**

The following ``create-vocabulary-filter`` example creates a vocabulary filter that uses a text file that contains a list of words that you wouldn't want to appear in a transcription. For language-code, specify the language code corresponding to the language of your vocabulary filter. For vocabulary-filter-file-uri, specify the Amazon Simple Storage Service (Amazon S3) URI of the text file. For vocabulary-filter-name, specify the name of your vocabulary filter. ::

    aws transcribe create-vocabulary-filter \
        --language-code language-code \
        --vocabulary-filter-file-uri s3://amzn-s3-demo-bucket/vocabulary-filter.txt \
        --vocabulary-filter-name cli-vocabulary-filter-example

Output::

    {
        "VocabularyFilterName": "cli-vocabulary-filter-example",
        "LanguageCode": "language-code"
    }

For more information, see `Filtering Unwanted Words <https://docs.aws.amazon.com/transcribe/latest/dg/filter-unwanted-words.html>`__ in the *Amazon Transcribe Developer Guide*.