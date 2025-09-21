**To retrieve a list of data stores**

The following ``list-datastores`` example displays summary information about the available data stores. ::

    aws iotanalytics list-datastores

Output::

    {
        "datastoreSummaries": [
            {
                "status": "ACTIVE",
                "datastoreName": "mydatastore",
                "creationTime": 1557858971.02,
                "lastUpdateTime": 1557858971.02
            }
        ]
    }

For more information, see `ListDatastores <https://docs.aws.amazon.com/iotanalytics/latest/APIReference/API_ListDatastores.html>`__ in the *AWS IoT Analytics API Reference*.
