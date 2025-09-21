**To get a list of read set activation jobs**

The following ``list-read-set-activation-jobs`` example gets a list of activation jobs for a sequence store with id ``1234567890``. ::

    aws omics list-read-set-activation-jobs \
        --sequence-store-id 1234567890

Output::

    {
        "activationJobs": [
            {
                "completionTime": "2022-12-06T22:33:42.828Z",
                "creationTime": "2022-12-06T22:32:45.213Z",
                "id": "1234567890",
                "sequenceStoreId": "1234567890",
                "status": "COMPLETED"
            },
            {
                "creationTime": "2022-12-06T22:35:10.100Z",
                "id": "1234567890",
                "sequenceStoreId": "1234567890",
                "status": "IN_PROGRESS"
            }
        ]
    }

For more information, see `Omics Storage <https://docs.aws.amazon.com/omics/latest/dev/sequence-stores.html>`__ in the *Amazon Omics Developer Guide*.
