**To create a data store**

The following ``create-datastore`` example creates a data store, which is a repository for messages. ::

    aws iotanalytics create-datastore \
        --cli-input-json file://create-datastore.json

Contents of ``create-datastore.json``::

    {
        "datastoreName": "mydatastore",
        "retentionPeriod": {
            "numberOfDays": 90
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
        "datastoreName": "mydatastore",
        "datastoreArn": "arn:aws:iotanalytics:us-west-2:123456789012:datastore/mydatastore",
        "retentionPeriod": {
            "numberOfDays": 90,
            "unlimited": false
        }
    }

For more information, see `CreateDatastore <https://docs.aws.amazon.com/iotanalytics/latest/APIReference/API_CreateDatastore.html>`__ in the *AWS IoT Analytics API Reference*.
