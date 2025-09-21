**To get a data store's properties**

The following ``get-datastore`` code example gets a data store's properties. ::

    aws medical-imaging get-datastore \
        --datastore-id 12345678901234567890123456789012


Output::

    {
        "datastoreProperties": {
            "datastoreId": "12345678901234567890123456789012",
            "datastoreName": "TestDatastore123",
            "datastoreStatus": "ACTIVE",
            "datastoreArn": "arn:aws:medical-imaging:us-east-1:123456789012:datastore/12345678901234567890123456789012",
            "createdAt": "2022-11-15T23:33:09.643000+00:00",
            "updatedAt": "2022-11-15T23:33:09.643000+00:00"
        }
    }

For more information, see `Getting data store properties <https://docs.aws.amazon.com/healthimaging/latest/devguide/get-data-store.html>`__ in the *AWS HealthImaging Developer Guide*.
