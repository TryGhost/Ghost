**To retrieve information about datasets**

The following ``list-datasets`` example lists summary information about available datasets. ::

    aws iotanalytics list-datasets

Output::

    {
        "datasetSummaries": [
            {
                "status": "ACTIVE",
                "datasetName": "mydataset",
                "lastUpdateTime": 1557859240.658,
                "triggers": [],
                "creationTime": 1557859240.658,
                "actions": [
                    {
                        "actionName": "query_32",
                        "actionType": "QUERY"
                    }
                ]
            }
        ]
    }

For more information, see `ListDatasets <https://docs.aws.amazon.com/iotanalytics/latest/APIReference/API_ListDatasets.html>`__ in the *AWS IoT Analytics API Reference*.
