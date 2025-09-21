**To create a data store**

The following ``create-datastore`` code example creates a data store with the name ``my-datastore``. ::

    aws medical-imaging create-datastore \
        --datastore-name "my-datastore"

Output::

    {
        "datastoreId": "12345678901234567890123456789012",
        "datastoreStatus": "CREATING"
    }

For more information, see `Creating a data store <https://docs.aws.amazon.com/healthimaging/latest/devguide/create-data-store.html>`__ in the *AWS HealthImaging Developer Guide*.
