**To list the summaries of all created document classifiers**

The following ``list-document-classifier-summaries`` example lists all created document classifier summaries. ::

    aws comprehend list-document-classifier-summaries

Output::

    {
        "DocumentClassifierSummariesList": [
            {
                "DocumentClassifierName": "example-classifier-1",
                "NumberOfVersions": 1,
                "LatestVersionCreatedAt": "2023-06-13T22:07:59.825000+00:00",
                "LatestVersionName": "1",
                "LatestVersionStatus": "TRAINED"
            },
            {
                "DocumentClassifierName": "example-classifier-2",
                "NumberOfVersions": 2,
                "LatestVersionCreatedAt": "2023-06-13T21:54:59.589000+00:00",
                "LatestVersionName": "2",
                "LatestVersionStatus": "TRAINED"
            }
        ]
    }

For more information, see `Creating and managing custom models <https://docs.aws.amazon.com/comprehend/latest/dg/manage-models.html>`__ in the *Amazon Comprehend Developer Guide*.