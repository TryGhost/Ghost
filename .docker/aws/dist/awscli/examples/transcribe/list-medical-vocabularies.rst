**To list your medical custom vocabularies**

The following ``list-medical-vocabularies`` example lists the medical custom vocabularies associated with your AWS account and Region. To get more information about a particular transcription job, copy the value of a ``MedicalTranscriptionJobName`` parameter in the transcription output, and specify that value for the ``MedicalTranscriptionJobName`` option of the ``get-medical-transcription-job`` command. To see more of your transcription jobs, copy the value of the ``NextToken`` parameter, run the ``list-medical-transcription-jobs`` command again, and specify that value in the ``--next-token`` option. ::

    aws transcribe list-medical-vocabularies

Output::

    {
        "Vocabularies": [
            {
                "VocabularyName": "cli-medical-vocab-2",
                "LanguageCode": "en-US",
                "LastModifiedTime": "2020-09-21T21:44:59.521000+00:00",
                "VocabularyState": "READY"
            },
            {
                "VocabularyName": "cli-medical-vocab-1",
                "LanguageCode": "en-US",
                "LastModifiedTime": "2020-09-19T23:59:04.349000+00:00",
                "VocabularyState": "READY"
            }
        ]
    }

For more information, see `Medical Custom Vocabularies <https://docs.aws.amazon.com/transcribe/latest/dg/how-vocabulary-med.html>`__ in the *Amazon Transcribe Developer Guide*.