**To list your transcription jobs**

The following ``list-transcription-jobs`` example lists the transcription jobs associated with your AWS account and Region. ::

    aws transcribe list-transcription-jobs

Output::

    {
        "NextToken": "NextToken",
        "TranscriptionJobSummaries": [
            {
                "TranscriptionJobName": "speak-id-job-1",
                "CreationTime": "2020-08-17T21:06:15.391000+00:00",
                "StartTime": "2020-08-17T21:06:15.416000+00:00",
                "CompletionTime": "2020-08-17T21:07:05.098000+00:00",
                "LanguageCode": "language-code",
                "TranscriptionJobStatus": "COMPLETED",
                "OutputLocationType": "SERVICE_BUCKET"
            },
            {
                "TranscriptionJobName": "job-1",
                "CreationTime": "2020-08-17T20:50:24.207000+00:00",
                "StartTime": "2020-08-17T20:50:24.230000+00:00",
                "CompletionTime": "2020-08-17T20:52:18.737000+00:00",
                "LanguageCode": "language-code",
                "TranscriptionJobStatus": "COMPLETED",
                "OutputLocationType": "SERVICE_BUCKET"
            },
            {
                "TranscriptionJobName": "sdk-test-job-4",
                "CreationTime": "2020-08-17T20:32:27.917000+00:00",
                "StartTime": "2020-08-17T20:32:27.956000+00:00",
                "CompletionTime": "2020-08-17T20:33:15.126000+00:00",
                "LanguageCode": "language-code",
                "TranscriptionJobStatus": "COMPLETED",
                "OutputLocationType": "SERVICE_BUCKET"
            },
            {
                "TranscriptionJobName": "Diarization-speak-id",
                "CreationTime": "2020-08-10T22:10:09.066000+00:00",
                "StartTime": "2020-08-10T22:10:09.116000+00:00",
                "CompletionTime": "2020-08-10T22:26:48.172000+00:00",
                "LanguageCode": "language-code",
                "TranscriptionJobStatus": "COMPLETED",
                "OutputLocationType": "SERVICE_BUCKET"
            },
            {
                "TranscriptionJobName": "your-transcription-job-name",
                "CreationTime": "2020-07-29T17:45:09.791000+00:00",
                "StartTime": "2020-07-29T17:45:09.826000+00:00",
                "CompletionTime": "2020-07-29T17:46:20.831000+00:00",
                "LanguageCode": "language-code",
                "TranscriptionJobStatus": "COMPLETED",
                "OutputLocationType": "SERVICE_BUCKET"
            }
        ]
    }

For more information, see `Getting Started (AWS Command Line Interface) <https://docs.aws.amazon.com/transcribe/latest/dg/getting-started-cli.html>`__ in the *Amazon Transcribe Developer Guide*.