**To get information about a medical custom vocabulary**

The following ``get-medical-vocabulary`` example gets information on a medical custom vocabulary. You can use the VocabularyState parameter to see the processing state of the vocabulary. If it's READY, you can use it in the StartMedicalTranscriptionJob operation.::

    aws transcribe get-medical-vocabulary \
        --vocabulary-name medical-vocab-example

Output::

    {
        "VocabularyName": "medical-vocab-example",
        "LanguageCode": "en-US",
        "VocabularyState": "READY",
        "LastModifiedTime": "2020-09-19T23:59:04.349000+00:00",
        "DownloadUri": "https://link-to-download-the-text-file-used-to-create-your-medical-custom-vocabulary"
    }

For more information, see `Medical Custom Vocabularies <https://docs.aws.amazon.com/transcribe/latest/dg/how-vocabulary.html>`__ in the *Amazon Transcribe Developer Guide*.