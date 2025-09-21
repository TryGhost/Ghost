**To activate an archived read set**

The following ``start-read-set-activation-job`` example activates two read sets. ::

    aws omics start-read-set-activation-job \
        --sequence-store-id 1234567890 \
        --sources readSetId=1234567890 readSetId=1234567890

Output::

    {
        "creationTime": "2022-12-06T22:35:10.100Z",
        "id": "1234567890",
        "sequenceStoreId": "1234567890",
        "status": "SUBMITTED"
    }

For more information, see `Omics Storage <https://docs.aws.amazon.com/omics/latest/dev/sequence-stores.html>`__ in the *Amazon Omics Developer Guide*.
