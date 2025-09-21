**Example 1: To transcribe a medical dictation stored as an audio file**

The following ``start-medical-transcription-job`` example transcribes an audio file. You specify the location of the transcription output in the ``OutputBucketName`` parameter. ::

    aws transcribe start-medical-transcription-job \
        --cli-input-json file://myfile.json

Contents of ``myfile.json``::

    {
        "MedicalTranscriptionJobName": "simple-dictation-medical-transcription-job",
        "LanguageCode": "language-code",
        "Specialty": "PRIMARYCARE",
        "Type": "DICTATION",
        "OutputBucketName":"amzn-s3-demo-bucket",
        "Media": {
            "MediaFileUri": "s3://amzn-s3-demo-bucket/your-audio-file.extension"
        }
    }

Output::

    {
        "MedicalTranscriptionJob": {
            "MedicalTranscriptionJobName": "simple-dictation-medical-transcription-job",
            "TranscriptionJobStatus": "IN_PROGRESS",
            "LanguageCode": "language-code",
            "Media": {
                "MediaFileUri": "s3://amzn-s3-demo-bucket/your-audio-file.extension"
            },
            "StartTime": "2020-09-20T00:35:22.256000+00:00",
            "CreationTime": "2020-09-20T00:35:22.218000+00:00",
            "Specialty": "PRIMARYCARE",
            "Type": "DICTATION"
        }
    }

For more information, see `Batch Transcription Overview <https://docs.aws.amazon.com/transcribe/latest/dg/batch-med-transcription.html>`__ in the *Amazon Transcribe Developer Guide*.

**Example 2: To transcribe a clinician-patient dialogue stored as an audio file**

The following ``start-medical-transcription-job`` example transcribes an audio file containing a clinician-patient dialogue. You specify the location of the transcription output in the OutputBucketName parameter. ::

    aws transcribe start-medical-transcription-job \
        --cli-input-json file://mysecondfile.json

Contents of ``mysecondfile.json``::

    {
        "MedicalTranscriptionJobName": "simple-dictation-medical-transcription-job",
        "LanguageCode": "language-code",
        "Specialty": "PRIMARYCARE",
        "Type": "CONVERSATION",
        "OutputBucketName":"amzn-s3-demo-bucket",
        "Media": {
            "MediaFileUri": "s3://amzn-s3-demo-bucket/your-audio-file.extension"
        }
    }

Output::

    {
        "MedicalTranscriptionJob": {
            "MedicalTranscriptionJobName": "simple-conversation-medical-transcription-job",
            "TranscriptionJobStatus": "IN_PROGRESS",
            "LanguageCode": "language-code",
            "Media": {
                "MediaFileUri": "s3://amzn-s3-demo-bucket/your-audio-file.extension"
            },
            "StartTime": "2020-09-20T23:19:49.965000+00:00",
            "CreationTime": "2020-09-20T23:19:49.941000+00:00",
            "Specialty": "PRIMARYCARE",
            "Type": "CONVERSATION"
        }
    }

For more information, see `Batch Transcription Overview <https://docs.aws.amazon.com/transcribe/latest/dg/batch-med-transcription.html>`__ in the *Amazon Transcribe Developer Guide*.

**Example 3: To transcribe a multichannel audio file of a clinician-patient dialogue**

The following ``start-medical-transcription-job`` example transcribes the audio from each channel in the audio file and merges the separate transcriptions from each channel into a single transcription output. You specify the location of the transcription output in the ``OutputBucketName`` parameter. ::

    aws transcribe start-medical-transcription-job \
        --cli-input-json file://mythirdfile.json

Contents of ``mythirdfile.json``::

    {
        "MedicalTranscriptionJobName": "multichannel-conversation-medical-transcription-job",
        "LanguageCode": "language-code",
        "Specialty": "PRIMARYCARE",
        "Type": "CONVERSATION",
        "OutputBucketName":"amzn-s3-demo-bucket",
            "Media": {
              "MediaFileUri": "s3://amzn-s3-demo-bucket/your-audio-file.extension"
            },
            "Settings":{
              "ChannelIdentification": true
            }
    }

Output::

    {
        "MedicalTranscriptionJob": {
            "MedicalTranscriptionJobName": "multichannel-conversation-medical-transcription-job",
            "TranscriptionJobStatus": "IN_PROGRESS",
            "LanguageCode": "language-code",
            "Media": {
                "MediaFileUri": "s3://amzn-s3-demo-bucket/your-audio-file.extension"
            },
            "StartTime": "2020-09-20T23:46:44.081000+00:00",
            "CreationTime": "2020-09-20T23:46:44.053000+00:00",
            "Settings": {
                "ChannelIdentification": true
            },
            "Specialty": "PRIMARYCARE",
            "Type": "CONVERSATION"
        }
    }

For more information, see `Channel Identification <https://docs.aws.amazon.com/transcribe/latest/dg/how-channel-id-med.html>`__ in the *Amazon Transcribe Developer Guide*.

**Example 4: To transcribe an audio file of a clinician-patient dialogue and identify the speakers in the transcription output**

The following ``start-medical-transcription-job`` example transcribes an audio file and labels the speech of each speaker in the transcription output. You specify the location of the transcription output in the ``OutputBucketName`` parameter. ::

    aws transcribe start-medical-transcription-job \
        --cli-input-json file://myfourthfile.json

Contents of ``myfourthfile.json``::

    {
        "MedicalTranscriptionJobName": "speaker-id-conversation-medical-transcription-job",
        "LanguageCode": "language-code",
        "Specialty": "PRIMARYCARE",
        "Type": "CONVERSATION",
        "OutputBucketName":"amzn-s3-demo-bucket",
        "Media": {
            "MediaFileUri": "s3://amzn-s3-demo-bucket/your-audio-file.extension"
            },
        "Settings":{
            "ShowSpeakerLabels": true,
            "MaxSpeakerLabels": 2
            }
    }

Output::

    {
        "MedicalTranscriptionJob": {
            "MedicalTranscriptionJobName": "speaker-id-conversation-medical-transcription-job",
            "TranscriptionJobStatus": "IN_PROGRESS",
            "LanguageCode": "language-code",
            "Media": {
                "MediaFileUri": "s3://amzn-s3-demo-bucket/your-audio-file.extension"
            },
            "StartTime": "2020-09-21T18:43:37.265000+00:00",
            "CreationTime": "2020-09-21T18:43:37.157000+00:00",
            "Settings": {
                "ShowSpeakerLabels": true,
                "MaxSpeakerLabels": 2
            },
            "Specialty": "PRIMARYCARE",
            "Type": "CONVERSATION"
        }
    }

For more information, see `Identifying Speakers <https://docs.aws.amazon.com/transcribe/latest/dg/diarization-med.html>`__ in the *Amazon Transcribe Developer Guide*.

**Example 5: To transcribe a medical conversation stored as an audio file with up to two transcription alternatives**

The following ``start-medical-transcription-job`` example creates up to two alternative transcriptions from a single audio file. Every transcriptions has a level of confidence associated with it. By default, Amazon Transcribe returns the transcription with the highest confidence level. You can specify that Amazon Transcribe return additional transcriptions with lower confidence levels. You specify the location of the transcription output in the ``OutputBucketName`` parameter. ::

    aws transcribe start-medical-transcription-job \
        --cli-input-json file://myfifthfile.json

Contents of ``myfifthfile.json``::

    {
        "MedicalTranscriptionJobName": "alternatives-conversation-medical-transcription-job",
        "LanguageCode": "language-code",
        "Specialty": "PRIMARYCARE",
        "Type": "CONVERSATION",
        "OutputBucketName":"amzn-s3-demo-bucket",
        "Media": {
            "MediaFileUri": "s3://amzn-s3-demo-bucket/your-audio-file.extension"
        },
        "Settings":{
            "ShowAlternatives": true,
            "MaxAlternatives": 2
        }
    }

Output::

    {
        "MedicalTranscriptionJob": {
            "MedicalTranscriptionJobName": "alternatives-conversation-medical-transcription-job",
            "TranscriptionJobStatus": "IN_PROGRESS",
            "LanguageCode": "language-code",
            "Media": {
                "MediaFileUri": "s3://amzn-s3-demo-bucket/your-audio-file.extension"
            },
            "StartTime": "2020-09-21T19:09:18.199000+00:00",
            "CreationTime": "2020-09-21T19:09:18.171000+00:00",
            "Settings": {
                "ShowAlternatives": true,
                "MaxAlternatives": 2
            },
            "Specialty": "PRIMARYCARE",
            "Type": "CONVERSATION"
        }
    }

For more information, see `Alternative Transcriptions <https://docs.aws.amazon.com/transcribe/latest/dg/how-alternatives-med.html>`__ in the *Amazon Transcribe Developer Guide*.

**Example 6: To transcribe an audio file of a medical dictation with up to two alternative transcriptions**

The following ``start-medical-transcription-job`` example transcribes an audio file and uses a vocabulary filter to mask any unwanted words. You specify the location of the transcription output in the OutputBucketName parameter. ::

    aws transcribe start-medical-transcription-job \
        --cli-input-json file://mysixthfile.json

Contents of ``mysixthfile.json``::

    {
        "MedicalTranscriptionJobName": "alternatives-conversation-medical-transcription-job",
        "LanguageCode": "language-code",
        "Specialty": "PRIMARYCARE",
        "Type": "DICTATION",
        "OutputBucketName":"amzn-s3-demo-bucket",
        "Media": {
            "MediaFileUri": "s3://amzn-s3-demo-bucket/your-audio-file.extension"
        },
        "Settings":{
              "ShowAlternatives": true,
              "MaxAlternatives": 2
        }
    }

Output::

    {
        "MedicalTranscriptionJob": {
            "MedicalTranscriptionJobName": "alternatives-dictation-medical-transcription-job",
            "TranscriptionJobStatus": "IN_PROGRESS",
            "LanguageCode": "language-code",
            "Media": {
                "MediaFileUri": "s3://amzn-s3-demo-bucket/your-audio-file.extension"
            },
            "StartTime": "2020-09-21T21:01:14.592000+00:00",
            "CreationTime": "2020-09-21T21:01:14.569000+00:00",
            "Settings": {
                "ShowAlternatives": true,
                "MaxAlternatives": 2
            },
            "Specialty": "PRIMARYCARE",
            "Type": "DICTATION"
        }
    }

For more information, see `Alternative Transcriptions <https://docs.aws.amazon.com/transcribe/latest/dg/how-alternatives-med.html>`__ in the *Amazon Transcribe Developer Guide*.

**Example 7: To transcribe an audio file of a medical dictation with increased accuracy by using a custom vocabulary**

The following ``start-medical-transcription-job`` example transcribes an audio file and uses a medical custom vocabulary you've previously created to increase the transcription accuracy. You specify the location of the transcription output in the ``OutputBucketName`` parameter. ::

    aws transcribe start-transcription-job \
        --cli-input-json file://myseventhfile.json

Contents of ``mysixthfile.json``::

    {
        "MedicalTranscriptionJobName": "vocabulary-dictation-medical-transcription-job",
        "LanguageCode": "language-code",
        "Specialty": "PRIMARYCARE",
        "Type": "DICTATION",
        "OutputBucketName":"amzn-s3-demo-bucket",
        "Media": {
            "MediaFileUri": "s3://amzn-s3-demo-bucket/your-audio-file.extension"
        },
        "Settings":{
            "VocabularyName": "cli-medical-vocab-1"
        }
    }

Output::

    {
        "MedicalTranscriptionJob": {
            "MedicalTranscriptionJobName": "vocabulary-dictation-medical-transcription-job",
            "TranscriptionJobStatus": "IN_PROGRESS",
            "LanguageCode": "language-code",
            "Media": {
                "MediaFileUri": "s3://amzn-s3-demo-bucket/your-audio-file.extension"
            },
            "StartTime": "2020-09-21T21:17:27.045000+00:00",
            "CreationTime": "2020-09-21T21:17:27.016000+00:00",
            "Settings": {
                "VocabularyName": "cli-medical-vocab-1"
            },
            "Specialty": "PRIMARYCARE",
            "Type": "DICTATION"
        }
    }

For more information, see `Medical Custom Vocabularies <https://docs.aws.amazon.com/transcribe/latest/dg/how-vocabulary-med.html>`__ in the *Amazon Transcribe Developer Guide*.