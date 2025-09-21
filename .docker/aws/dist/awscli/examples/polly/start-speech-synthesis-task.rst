**To synthesize text**

The following ``start-speech-synthesis-task`` example synthesizes the text in ``text_file.txt`` and stores the resulting MP3 file in the specified bucket. ::

    aws polly start-speech-synthesis-task \
        --output-format mp3 \
        --output-s3-bucket-name amzn-s3-demo-bucket \
        --text  file://text_file.txt \
        --voice-id Joanna

Output::

    {
        "SynthesisTask": {
            "TaskId": "70b61c0f-57ce-4715-a247-cae8729dcce9",
            "TaskStatus": "scheduled",
            "OutputUri": "https://s3.us-east-2.amazonaws.com/amzn-s3-demo-bucket/70b61c0f-57ce-4715-a247-cae8729dcce9.mp3",
            "CreationTime": 1603911042.689,
            "RequestCharacters": 1311,
            "OutputFormat": "mp3",
            "TextType": "text",
            "VoiceId": "Joanna"
        }
    }

For more information, see `Creating long audio files <https://docs.aws.amazon.com/polly/latest/dg/longer-cli.html>`__ in the *Amazon Polly Developer Guide*.

