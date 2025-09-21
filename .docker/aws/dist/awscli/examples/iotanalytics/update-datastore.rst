**To update a data store**

The following ``update-datastore`` example modifies the settings of the specified data store. ::

    aws iotanalytics update-datastore \
        --cli-input-json file://update-datastore.json

Contents of update-datastore.json::

    {
        "datastoreName": "mydatastore",
        "retentionPeriod": {
            "numberOfDays": 93
        }
    }

This command produces no output.

For more information, see `UpdateDatastore <https://docs.aws.amazon.com/iotanalytics/latest/APIReference/API_UpdateDatastore.html>`__ in the *AWS IoT Analytics API Reference*.
