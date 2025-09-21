**To get information about a specific medical transcription job**

The following ``get-medical-transcription-job`` example gets information about a specific medical transcription job. To access the transcription results, use the TranscriptFileUri parameter. If you've enabled additional features for the transcription job, you can see them in the Settings object. The Specialty parameter shows the medical specialty of the provider. The Type parameter indicates whether the speech in the transcription job is of a medical conversation, or a medical dictation. ::

    aws transcribe get-medical-transcription-job \
        --medical-transcription-job-name vocabulary-dictation-medical-transcription-job

Output::

    {
        "MedicalTranscriptionJob": {
            "MedicalTranscriptionJobName": "vocabulary-dictation-medical-transcription-job",
            "TranscriptionJobStatus": "COMPLETED",
            "LanguageCode": "en-US",
            "MediaSampleRateHertz": 48000,
            "MediaFormat": "mp4",
            "Media": {
                "MediaFileUri": "s3://Amazon-S3-Prefix/your-audio-file.file-extension"
            },
            "Transcript": {
                "TranscriptFileUri": "https://s3.Region.amazonaws.com/Amazon-S3-Prefix/vocabulary-dictation-medical-transcription-job.json"
            },
            "StartTime": "2020-09-21T21:17:27.045000+00:00",
            "CreationTime": "2020-09-21T21:17:27.016000+00:00",
            "CompletionTime": "2020-09-21T21:17:59.561000+00:00",
            "Settings": {
                "ChannelIdentification": false,
                "ShowAlternatives": false,
                "VocabularyName": "cli-medical-vocab-example"
            },
            "Specialty": "PRIMARYCARE",
            "Type": "DICTATION"
        }
    }

For more information, see `Batch Transcription <https://docs.aws.amazon.com/transcribe/latest/dg/batch-med-transcription.html>`__ in the *Amazon Transcribe Developer Guide*.