**To get information about a specific transcription job**

The following ``get-transcription-job`` example gets information about a specific transcription job. To access the transcription results, use the TranscriptFileUri parameter. Use the MediaFileUri parameter to see which audio file you transcribed with this job. You can use the Settings object to see the optional features you've enabled in the transcription job. ::

    aws transcribe get-transcription-job \
        --transcription-job-name your-transcription-job

Output::

    {
        "TranscriptionJob": {
            "TranscriptionJobName": "your-transcription-job",
            "TranscriptionJobStatus": "COMPLETED",
            "LanguageCode": "language-code",
            "MediaSampleRateHertz": 48000,
            "MediaFormat": "mp4",
            "Media": {
                "MediaFileUri": "s3://amzn-s3-demo-bucket/your-audio-file.file-extension"
            },
            "Transcript": {
                "TranscriptFileUri": "https://Amazon-S3-file-location-of-transcription-output"
            },
            "StartTime": "2020-09-18T22:27:23.970000+00:00",
            "CreationTime": "2020-09-18T22:27:23.948000+00:00",
            "CompletionTime": "2020-09-18T22:28:21.197000+00:00",
            "Settings": {
                "ChannelIdentification": false,
                "ShowAlternatives": false
            },
            "IdentifyLanguage": true,
            "IdentifiedLanguageScore": 0.8672199249267578
        }
    }

For more information, see `Getting Started (AWS Command Line Interface) <https://docs.aws.amazon.com/transcribe/latest/dg/getting-started-cli.html>`__ in the *Amazon Transcribe Developer Guide*.