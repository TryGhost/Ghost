**To get the thing indexing configuration**

The following ``get-indexing-configuration`` example gets the current configuration data for AWS IoT fleet indexing. ::

    aws iot get-indexing-configuration

Output::

    {
        "thingIndexingConfiguration": {
            "thingIndexingMode": "OFF",
            "thingConnectivityIndexingMode": "OFF"
        },
        "thingGroupIndexingConfiguration": {
            "thingGroupIndexingMode": "OFF"
        }
    }

For more information, see `Managing Thing Indexing <https://docs.aws.amazon.com/iot/latest/developerguide/managing-index.html>`__ in the *AWS IoT Developers Guide*.

