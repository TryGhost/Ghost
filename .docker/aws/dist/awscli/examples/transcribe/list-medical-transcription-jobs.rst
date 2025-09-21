**To list your medical transcription jobs**

The following ``list-medical-transcription-jobs`` example lists the medical transcription jobs associated with your AWS account and Region. To get more information about a particular transcription job, copy the value of a MedicalTranscriptionJobName parameter in the transcription output, and specify that value for the ``MedicalTranscriptionJobName`` option of the ``get-medical-transcription-job`` command. To see more of your transcription jobs, copy the value of the NextToken parameter, run the ``list-medical-transcription-jobs`` command again, and specify that value in the ``--next-token`` option. ::

    aws transcribe list-medical-transcription-jobs


Output::

    {
        "NextToken": "3/PblzkiGhzjER3KHuQt2fmbPLF7cDYafjFMEoGn44ON/gsuUSTIkGyanvRE6WMXFd/ZTEc2EZj+P9eii/z1O2FDYli6RLI0WoRX4RwMisVrh9G0Kie0Y8ikBCdtqlZB10Wa9McC+ebOl+LaDtZPC4u6ttoHLRlEfzqstHXSgapXg3tEBtm9piIaPB6MOM5BB6t86+qtmocTR/qrteHZBBudhTfbCwhsxaqujHiiUvFdm3BQbKKWIW06yV9b+4f38oD2lVIan+vfUs3gBYAl5VTDmXXzQPBQOHPjtwmFI+IWX15nSUjWuN3TUylHgPWzDaYT8qBtu0Z+3UG4V6b+K2CC0XszXg5rBq9hYgNzy4XoFh/6s5DoSnzq49Q9xHgHdT2yBADFmvFK7myZBsj75+2vQZOSVpWUPy3WT/32zFAcoELHR4unuWhXPwjbKU+mFYfUjtTZ8n/jq7aQEjQ42A+X/7K6JgOcdVPtEg8PlDr5kgYYG3q3OmYXX37U3FZuJmnTI63VtIXsNnOU5eGoYObtpk00Nq9UkzgSJxqj84ZD5n+S0EGy9ZUYBJRRcGeYUM3Q4DbSJfUwSAqcFdLIWZdp8qIREMQIBWy7BLwSdyqsQo2vRrd53hm5aWM7SVf6pPq6X/IXR5+1eUOOD8/coaTT4ES2DerbV6RkV4o0VT1d0SdVX/MmtkNG8nYj8PqU07w7988quh1ZP6D80veJS1q73tUUR9MjnGernW2tAnvnLNhdefBcD+sZVfYq3iBMFY7wTy1P1G6NqW9GrYDYoX3tTPWlD7phpbVSyKrh/PdYrps5UxnsGoA1b7L/FfAXDfUoGrGUB4N3JsPYXX9D++g+6gV1qBBs/WfF934aKqfD6UTggm/zV3GAOWiBpfvAZRvEb924i6yGHyMC7y54O1ZAwSBupmI+FFd13CaPO4kN1vJlth6aM5vUPXg4BpyUhtbRhwD/KxCvf9K0tLJGyL1A==",
        "MedicalTranscriptionJobSummaries": [
            {
                "MedicalTranscriptionJobName": "vocabulary-dictation-medical-transcription-job",
                "CreationTime": "2020-09-21T21:17:27.016000+00:00",
                "StartTime": "2020-09-21T21:17:27.045000+00:00",
                "CompletionTime": "2020-09-21T21:17:59.561000+00:00",
                "LanguageCode": "en-US",
                "TranscriptionJobStatus": "COMPLETED",
                "OutputLocationType": "CUSTOMER_BUCKET",
                "Specialty": "PRIMARYCARE",
                "Type": "DICTATION"
            },
            {
                "MedicalTranscriptionJobName": "alternatives-dictation-medical-transcription-job",
                "CreationTime": "2020-09-21T21:01:14.569000+00:00",
                "StartTime": "2020-09-21T21:01:14.592000+00:00",
                "CompletionTime": "2020-09-21T21:01:43.606000+00:00",
                "LanguageCode": "en-US",
                "TranscriptionJobStatus": "COMPLETED",
                "OutputLocationType": "CUSTOMER_BUCKET",
                "Specialty": "PRIMARYCARE",
                "Type": "DICTATION"
            },
            {
                "MedicalTranscriptionJobName": "alternatives-conversation-medical-transcription-job",
                "CreationTime": "2020-09-21T19:09:18.171000+00:00",
                "StartTime": "2020-09-21T19:09:18.199000+00:00",
                "CompletionTime": "2020-09-21T19:10:22.516000+00:00",
                "LanguageCode": "en-US",
                "TranscriptionJobStatus": "COMPLETED",
                "OutputLocationType": "CUSTOMER_BUCKET",
                "Specialty": "PRIMARYCARE",
                "Type": "CONVERSATION"
            },
            {
                "MedicalTranscriptionJobName": "speaker-id-conversation-medical-transcription-job",
                "CreationTime": "2020-09-21T18:43:37.157000+00:00",
                "StartTime": "2020-09-21T18:43:37.265000+00:00",
                "CompletionTime": "2020-09-21T18:44:21.192000+00:00",
                "LanguageCode": "en-US",
                "TranscriptionJobStatus": "COMPLETED",
                "OutputLocationType": "CUSTOMER_BUCKET",
                "Specialty": "PRIMARYCARE",
                "Type": "CONVERSATION"
            },
            {
                "MedicalTranscriptionJobName": "multichannel-conversation-medical-transcription-job",
                "CreationTime": "2020-09-20T23:46:44.053000+00:00",
                "StartTime": "2020-09-20T23:46:44.081000+00:00",
                "CompletionTime": "2020-09-20T23:47:35.851000+00:00",
                "LanguageCode": "en-US",
                "TranscriptionJobStatus": "COMPLETED",
                "OutputLocationType": "CUSTOMER_BUCKET",
                "Specialty": "PRIMARYCARE",
                "Type": "CONVERSATION"
            }
        ]
    }

For more information, see `https://docs.aws.amazon.com/transcribe/latest/dg/batch-med-transcription.html>`__ in the *Amazon Transcribe Developer Guide*.