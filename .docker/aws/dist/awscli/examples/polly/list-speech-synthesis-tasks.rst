**To list your speech synthesis tasks**

The following ``list-speech-synthesis-tasks`` example lists your speech synthesis tasks. ::

    aws polly list-speech-synthesis-tasks 

Output::

    {
        "SynthesisTasks": [
            {
                "TaskId": "70b61c0f-57ce-4715-a247-cae8729dcce9",
                "TaskStatus": "completed",
                "OutputUri": "https://s3.us-west-2.amazonaws.com/amzn-s3-demo-bucket/70b61c0f-57ce-4715-a247-cae8729dcce9.mp3",
                "CreationTime": 1603911042.689,
                "RequestCharacters": 1311,
                "OutputFormat": "mp3",
                "TextType": "text",
                "VoiceId": "Joanna"
            }
        ]
    }

For more information, see `Creating long audio files <https://docs.aws.amazon.com/polly/latest/dg/longer-cli.html>`__ in the *Amazon Polly Developer Guide*.

