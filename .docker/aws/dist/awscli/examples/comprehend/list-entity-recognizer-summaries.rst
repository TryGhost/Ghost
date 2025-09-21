**To list of summaries for all created entity recognizers**

The following ``list-entity-recognizer-summaries`` example lists all entity recognizer summaries. ::

    aws comprehend list-entity-recognizer-summaries

Output::

    {
        "EntityRecognizerSummariesList": [
            {
                "RecognizerName": "entity-recognizer-3",
                "NumberOfVersions": 2,
                "LatestVersionCreatedAt": "2023-06-15T23:15:07.621000+00:00",
                "LatestVersionName": "2",
                "LatestVersionStatus": "STOP_REQUESTED"
            },
            {
                "RecognizerName": "entity-recognizer-2",
                "NumberOfVersions": 1,
                "LatestVersionCreatedAt": "2023-06-14T22:55:27.805000+00:00",
                "LatestVersionName": "2"
                "LatestVersionStatus": "TRAINED"
            },
            {
                "RecognizerName": "entity-recognizer-1",
                "NumberOfVersions": 1,
                "LatestVersionCreatedAt": "2023-06-14T20:44:59.631000+00:00",
                "LatestVersionName": "1",
                "LatestVersionStatus": "TRAINED"
            }
        ]
    }

For more information, see `Custom entity recognition <https://docs.aws.amazon.com/comprehend/latest/dg/custom-entity-recognition.html>`__ in the *Amazon Comprehend Developer Guide*.