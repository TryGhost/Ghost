**To list data stores**

The following ``list-datastores`` code example lists available data stores. ::

    aws medical-imaging list-datastores

Output::

    {
        "datastoreSummaries": [
            {
                "datastoreId": "12345678901234567890123456789012",
                "datastoreName": "TestDatastore123",
                "datastoreStatus": "ACTIVE",
                "datastoreArn": "arn:aws:medical-imaging:us-east-1:123456789012:datastore/12345678901234567890123456789012",
                "createdAt": "2022-11-15T23:33:09.643000+00:00",
                "updatedAt": "2022-11-15T23:33:09.643000+00:00"
            }
        ]
    }


For more information, see `Listing data stores <https://docs.aws.amazon.com/healthimaging/latest/devguide/list-data-stores.html>`__ in the *AWS HealthImaging Developer Guide*.
