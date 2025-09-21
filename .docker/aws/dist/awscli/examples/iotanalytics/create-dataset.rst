**To create a dataset**

The following ``create-dataset`` example creates a dataset. A dataset stores data retrieved from a data store by applying a ``queryAction`` (a SQL query) or a ``containerAction`` (executing a containerized application). This operation creates the skeleton of a dataset. You can populate the dataset manually by calling ``CreateDatasetContent`` or automatically according to a ``trigger`` you specify. ::

    aws iotanalytics create-dataset \
        --cli-input-json file://create-dataset.json

Contents of ``create-dataset.json``::

    {
        "datasetName": "mydataset",
        "actions": [
            {
                "actionName": "myDatasetAction",
                "queryAction": {
                    "sqlQuery": "SELECT * FROM mydatastore"
                }
            }
        ],
        "retentionPeriod": {
            "unlimited": true
        },
        "tags": [
            {
                "key": "Environment",
                "value": "Production"
            }
        ]
    }

Output::

    {
        "datasetName": "mydataset",
        "retentionPeriod": {
            "unlimited": true
        },
        "datasetArn": "arn:aws:iotanalytics:us-west-2:123456789012:dataset/mydataset"
    }

For more information, see `CreateDataset <https://docs.aws.amazon.com/iotanalytics/latest/APIReference/API_CreateDataset.html>`__ in the *AWS IoT Analytics API Reference*.
