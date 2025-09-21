**To list information about dataset contents**

The following ``list-dataset-contents`` example lists information about dataset contents that have been created. ::

    aws iotanalytics list-dataset-contents \
        --dataset-name mydataset

Output::

    {
        "datasetContentSummaries": [
            {
                "status": {
                    "state": "SUCCEEDED"
                },
                "scheduleTime": 1557863215.995,
                "version": "b10ea2a9-66c1-4d99-8d1f-518113b738d0",
                "creationTime": 1557863215.995
            }
        ]
    }

For more information, see `ListDatasetContents <https://docs.aws.amazon.com/iotanalytics/latest/APIReference/API_ListDatasetContents.html>`__ in the *AWS IoT Analytics API Reference*.
