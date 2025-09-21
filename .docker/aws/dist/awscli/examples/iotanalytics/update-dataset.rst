**To update a dataset**

The following ``update-dataset`` example modifies the settings of the specified dataset. ::

    aws iotanalytics update-dataset \
        --cli-input-json file://update-dataset.json

Contents of ``update-dataset.json``::

    {
        "datasetName": "mydataset",
        "actions": [
            {
                "actionName": "myDatasetUpdateAction",
                "queryAction": {
                    "sqlQuery": "SELECT * FROM mydatastore"
                }
            }
        ],
        "retentionPeriod": {
            "numberOfDays": 92
        }
    }

This command produces no output.

For more information, see `UpdateDataset <https://docs.aws.amazon.com/iotanalytics/latest/APIReference/API_UpdateDataset.html
>`__ in the *AWS IoT Analytics API Reference*.
