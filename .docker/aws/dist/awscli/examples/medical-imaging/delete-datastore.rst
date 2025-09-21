**To delete a data store**

The following ``delete-datastore`` code example deletes a data store. ::

    aws medical-imaging delete-datastore \
        --datastore-id "12345678901234567890123456789012"

Output::

    {
        "datastoreId": "12345678901234567890123456789012",
        "datastoreStatus": "DELETING"
    }

For more information, see `Deleting a data store <https://docs.aws.amazon.com/healthimaging/latest/devguide/delete-data-store.html>`__ in the *AWS HealthImaging Developer Guide*.
