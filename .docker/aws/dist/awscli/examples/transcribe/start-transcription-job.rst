**Example 1: To transcribe an audio file**

The following ``start-transcription-job`` example transcribes your audio file. ::

    aws transcribe start-transcription-job \
        --cli-input-json file://myfile.json

Contents of ``myfile.json``::

    {
        "TranscriptionJobName": "cli-simple-transcription-job",
        "LanguageCode": "the-language-of-your-transcription-job",
        "Media": {
            "MediaFileUri": "s3://amzn-s3-demo-bucket/Amazon-S3-prefix/your-media-file-name.file-extension"
        }
    }

For more information, see `Getting Started (AWS Command Line Interface) <https://docs.aws.amazon.com/transcribe/latest/dg/getting-started-cli.html>`__ in the *Amazon Transcribe Developer Guide*.

**Example 2: To transcribe a multi-channel audio file**

The following ``start-transcription-job`` example transcribes your multi-channel audio file. ::

    aws transcribe start-transcription-job \
        --cli-input-json file://mysecondfile.json

Contents of ``mysecondfile.json``::

    {
        "TranscriptionJobName": "cli-channelid-job",
        "LanguageCode": "the-language-of-your-transcription-job",
        "Media": {
            "MediaFileUri": "s3://amzn-s3-demo-bucket/Amazon-S3-prefix/your-media-file-name.file-extension"
        },
        "Settings":{
            "ChannelIdentification":true
        }
    }

Output::

    {
        "TranscriptionJob": {
            "TranscriptionJobName": "cli-channelid-job",
            "TranscriptionJobStatus": "IN_PROGRESS",
            "LanguageCode": "the-language-of-your-transcription-job",
            "Media": {
                "MediaFileUri": "s3://amzn-s3-demo-bucket/Amazon-S3-prefix/your-media-file-name.file-extension"
            },
            "StartTime": "2020-09-17T16:07:56.817000+00:00",
            "CreationTime": "2020-09-17T16:07:56.784000+00:00",
            "Settings": {
                "ChannelIdentification": true
            }
        }
    }

For more information, see `Transcribing Multi-Channel Audio <https://docs.aws.amazon.com/transcribe/latest/dg/channel-id.html>`__ in the *Amazon Transcribe Developer Guide*.

**Example 3: To transcribe an audio file and identify the different speakers**

The following ``start-transcription-job`` example transcribes your audio file and identifies the speakers in the transcription output. ::

    aws transcribe start-transcription-job \
        --cli-input-json file://mythirdfile.json

Contents of ``mythirdfile.json``::

    {
        "TranscriptionJobName": "cli-speakerid-job",
        "LanguageCode": "the-language-of-your-transcription-job",
        "Media": {
            "MediaFileUri": "s3://amzn-s3-demo-bucket/Amazon-S3-prefix/your-media-file-name.file-extension"
        },
        "Settings":{
        "ShowSpeakerLabels": true,
        "MaxSpeakerLabels": 2
        }
    }

Output::

    {
        "TranscriptionJob": {
            "TranscriptionJobName": "cli-speakerid-job",
            "TranscriptionJobStatus": "IN_PROGRESS",
            "LanguageCode": "the-language-of-your-transcription-job",
            "Media": {
                "MediaFileUri": "s3://amzn-s3-demo-bucket/Amazon-S3-prefix/your-media-file-name.file-extension"
            },
            "StartTime": "2020-09-17T16:22:59.696000+00:00",
            "CreationTime": "2020-09-17T16:22:59.676000+00:00",
            "Settings": {
                "ShowSpeakerLabels": true,
                "MaxSpeakerLabels": 2
            }
        }
    }

For more information, see `Identifying Speakers <https://docs.aws.amazon.com/transcribe/latest/dg/diarization.html>`__ in the *Amazon Transcribe Developer Guide*.

**Example 4: To transcribe an audio file and mask any unwanted words in the transcription output**

The following ``start-transcription-job`` example transcribes your audio file and uses a vocabulary filter you've previously created to mask any unwanted words. ::

    aws transcribe start-transcription-job \
        --cli-input-json file://myfourthfile.json

Contents of ``myfourthfile.json``::

    {
        "TranscriptionJobName": "cli-filter-mask-job",
        "LanguageCode": "the-language-of-your-transcription-job",
        "Media": {
              "MediaFileUri": "s3://amzn-s3-demo-bucket/Amazon-S3-prefix/your-media-file-name.file-extension"
        },
        "Settings":{
            "VocabularyFilterName": "your-vocabulary-filter",
            "VocabularyFilterMethod": "mask"
        }
    }

Output::

    {
        "TranscriptionJob": {
            "TranscriptionJobName": "cli-filter-mask-job",
            "TranscriptionJobStatus": "IN_PROGRESS",
            "LanguageCode": "the-language-of-your-transcription-job",
            "Media": {
                "MediaFileUri": "s3://Amazon-S3-Prefix/your-media-file.file-extension"
            },
            "StartTime": "2020-09-18T16:36:18.568000+00:00",
            "CreationTime": "2020-09-18T16:36:18.547000+00:00",
            "Settings": {
                "VocabularyFilterName": "your-vocabulary-filter",
                "VocabularyFilterMethod": "mask"
            }
        }
    }

For more information, see `Filtering Transcriptions <https://docs.aws.amazon.com/transcribe/latest/dg/filter-transcriptions.html>`__ in the *Amazon Transcribe Developer Guide*.

**Example 5: To transcribe an audio file and remove any unwanted words in the transcription output**

The following ``start-transcription-job`` example transcribes your audio file and uses a vocabulary filter you've previously created to mask any unwanted words. ::

    aws transcribe start-transcription-job \
        --cli-input-json file://myfifthfile.json

Contents of ``myfifthfile.json``::

    {
        "TranscriptionJobName": "cli-filter-remove-job",
        "LanguageCode": "the-language-of-your-transcription-job",
        "Media": {
            "MediaFileUri": "s3://amzn-s3-demo-bucket/Amazon-S3-prefix/your-media-file-name.file-extension"
        },
        "Settings":{
            "VocabularyFilterName": "your-vocabulary-filter",
            "VocabularyFilterMethod": "remove"
        }
    }

Output::

    {
        "TranscriptionJob": {
            "TranscriptionJobName": "cli-filter-remove-job",
            "TranscriptionJobStatus": "IN_PROGRESS",
            "LanguageCode": "the-language-of-your-transcription-job",
            "Media": {
                "MediaFileUri": "s3://amzn-s3-demo-bucket/Amazon-S3-prefix/your-media-file-name.file-extension"
            },
            "StartTime": "2020-09-18T16:36:18.568000+00:00",
            "CreationTime": "2020-09-18T16:36:18.547000+00:00",
            "Settings": {
                "VocabularyFilterName": "your-vocabulary-filter",
                "VocabularyFilterMethod": "remove"
            }
        }
    }

For more information, see `Filtering Transcriptions <https://docs.aws.amazon.com/transcribe/latest/dg/filter-transcriptions.html>`__ in the *Amazon Transcribe Developer Guide*.

**Example 6: To transcribe an audio file with increased accuracy using a custom vocabulary**

The following ``start-transcription-job`` example transcribes your audio file and uses a vocabulary filter you've previously created to mask any unwanted words. ::

    aws transcribe start-transcription-job \
        --cli-input-json file://mysixthfile.json

Contents of ``mysixthfile.json``::

    {
        "TranscriptionJobName": "cli-vocab-job",
        "LanguageCode": "the-language-of-your-transcription-job",
        "Media": {
            "MediaFileUri": "s3://amzn-s3-demo-bucket/Amazon-S3-prefix/your-media-file-name.file-extension"
        },
        "Settings":{
            "VocabularyName": "your-vocabulary"
        }
    }

Output::

    {
        "TranscriptionJob": {
            "TranscriptionJobName": "cli-vocab-job",
            "TranscriptionJobStatus": "IN_PROGRESS",
            "LanguageCode": "the-language-of-your-transcription-job",
            "Media": {
                "MediaFileUri": "s3://amzn-s3-demo-bucket/Amazon-S3-prefix/your-media-file-name.file-extension"
            },
            "StartTime": "2020-09-18T16:36:18.568000+00:00",
            "CreationTime": "2020-09-18T16:36:18.547000+00:00",
            "Settings": {
                "VocabularyName": "your-vocabulary"
            }
        }
    }

For more information, see `Filtering Transcriptions <https://docs.aws.amazon.com/transcribe/latest/dg/filter-transcriptions.html>`__ in the *Amazon Transcribe Developer Guide*.

**Example 7: To identify the language of an audio file and transcribe it**

The following ``start-transcription-job`` example transcribes your audio file and uses a vocabulary filter you've previously created to mask any unwanted words. ::

    aws transcribe start-transcription-job \
        --cli-input-json file://myseventhfile.json

Contents of ``myseventhfile.json``::

    {
        "TranscriptionJobName": "cli-identify-language-transcription-job",
        "IdentifyLanguage": true,
        "Media": {
            "MediaFileUri": "s3://amzn-s3-demo-bucket/Amazon-S3-prefix/your-media-file-name.file-extension"
        }
    }

Output::

    {
        "TranscriptionJob": {
            "TranscriptionJobName": "cli-identify-language-transcription-job",
            "TranscriptionJobStatus": "IN_PROGRESS",
            "Media": {
                "MediaFileUri": "s3://amzn-s3-demo-bucket/Amazon-S3-prefix/your-media-file-name.file-extension"
            },
            "StartTime": "2020-09-18T22:27:23.970000+00:00",
            "CreationTime": "2020-09-18T22:27:23.948000+00:00",
            "IdentifyLanguage": true
        }
    }

For more information, see `Identifying the Language <https://docs.aws.amazon.com/transcribe/latest/dg/auto-lang-id.html>`__ in the *Amazon Transcribe Developer Guide*.

**Example 8: To transcribe an audio file with personally identifiable information redacted**

The following ``start-transcription-job`` example transcribes your audio file and redacts any personally identifiable information in the transcription output. ::

    aws transcribe start-transcription-job \
        --cli-input-json file://myeighthfile.json

Contents of ``myeigthfile.json``::

    {
        "TranscriptionJobName": "cli-redaction-job",
        "LanguageCode": "language-code",
        "Media": {
            "MediaFileUri": "s3://Amazon-S3-Prefix/your-media-file.file-extension"
        },
        "ContentRedaction": {
            "RedactionOutput":"redacted",
            "RedactionType":"PII"
        }
    }

Output::

    {
        "TranscriptionJob": {
            "TranscriptionJobName": "cli-redaction-job",
            "TranscriptionJobStatus": "IN_PROGRESS",
            "LanguageCode": "language-code",
            "Media": {
                "MediaFileUri": "s3://Amazon-S3-Prefix/your-media-file.file-extension"
            },
            "StartTime": "2020-09-25T23:49:13.195000+00:00",
            "CreationTime": "2020-09-25T23:49:13.176000+00:00",
            "ContentRedaction": {
                "RedactionType": "PII",
                "RedactionOutput": "redacted"
            }
        }
    }

For more information, see `Automatic Content Redaction <https://docs.aws.amazon.com/transcribe/latest/dg/content-redaction.html>`__ in the *Amazon Transcribe Developer Guide*.

**Example 9: To generate a transcript with personally identifiable information (PII) redacted and an unredacted transcript**

The following ``start-transcription-job`` example generates two transcrptions of your audio file, one with the personally identifiable information redacted, and the other without any redactions. ::

    aws transcribe start-transcription-job \
        --cli-input-json file://myninthfile.json

Contents of ``myninthfile.json``::

    {
        "TranscriptionJobName": "cli-redaction-job-with-unredacted-transcript",
        "LanguageCode": "language-code",
        "Media": {
              "MediaFileUri": "s3://Amazon-S3-Prefix/your-media-file.file-extension"
            },
        "ContentRedaction": {
            "RedactionOutput":"redacted_and_unredacted",
            "RedactionType":"PII"
        }
    }

Output::

    {
        "TranscriptionJob": {
            "TranscriptionJobName": "cli-redaction-job-with-unredacted-transcript",
            "TranscriptionJobStatus": "IN_PROGRESS",
            "LanguageCode": "language-code",
            "Media": {
                "MediaFileUri": "s3://Amazon-S3-Prefix/your-media-file.file-extension"
            },
            "StartTime": "2020-09-25T23:59:47.677000+00:00",
            "CreationTime": "2020-09-25T23:59:47.653000+00:00",
            "ContentRedaction": {
                "RedactionType": "PII",
                "RedactionOutput": "redacted_and_unredacted"
            }
        }
    }

For more information, see `Automatic Content Redaction <https://docs.aws.amazon.com/transcribe/latest/dg/content-redaction.html>`__ in the *Amazon Transcribe Developer Guide*.

**Example 10: To use a custom language model you've previously created to transcribe an audio file.**

The following ``start-transcription-job`` example transcribes your audio file with a custom language model you've previously created. ::

    aws transcribe start-transcription-job \
        --cli-input-json file://mytenthfile.json

Contents of ``mytenthfile.json``::

    {
        "TranscriptionJobName": "cli-clm-2-job-1",
        "LanguageCode": "language-code",
        "Media": {
            "MediaFileUri": "s3://amzn-s3-demo-bucket/your-audio-file.file-extension"
        },
        "ModelSettings": {
            "LanguageModelName":"cli-clm-2"
        }
    }

Output::

    {
        "TranscriptionJob": {
            "TranscriptionJobName": "cli-clm-2-job-1",
            "TranscriptionJobStatus": "IN_PROGRESS",
            "LanguageCode": "language-code",
            "Media": {
                "MediaFileUri": "s3://amzn-s3-demo-bucket/your-audio-file.file-extension"
            },
            "StartTime": "2020-09-28T17:56:01.835000+00:00",
            "CreationTime": "2020-09-28T17:56:01.801000+00:00",
            "ModelSettings": {
                "LanguageModelName": "cli-clm-2"
            }
        }
    }

For more information, see `Improving Domain-Specific Transcription Accuracy with Custom Language Models <https://docs.aws.amazon.com/transcribe/latest/dg/custom-language-models.html>`__ in the *Amazon Transcribe Developer Guide*.