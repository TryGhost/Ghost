**To view a read set activation job**

The following ``get-read-set-activation-job`` example gets details about a read set activation job. ::

    aws omics get-read-set-activation-job \
        --sequence-store-id 1234567890 \
        --id 1234567890

Output::

    {
        "completionTime": "2022-12-06T22:33:42.828Z",
        "creationTime": "2022-12-06T22:32:45.213Z",
        "id": "1234567890",
        "sequenceStoreId": "1234567890",
        "sources": [
            {
                "readSetId": "1234567890",
                "status": "FINISHED",
                "statusMessage": "No activation needed as read set is already in ACTIVATING or ACTIVE state."
            }
        ],
        "status": "COMPLETED",
        "statusMessage": "The job completed successfully."
    }

For more information, see `Omics Storage <https://docs.aws.amazon.com/omics/latest/dev/sequence-stores.html>`__ in the *Amazon Omics Developer Guide*.
