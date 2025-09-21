**To gets a list of read set export jobs**

The following ``list-read-set-export-jobs`` example gets a list of export jobs for a sequence store with id ``1234567890``. ::

    aws omics list-read-set-export-jobs \
        --sequence-store-id 1234567890

Output::

    {
        "exportJobs": [
            {
                "completionTime": "2022-12-06T22:39:14.491Z",
                "creationTime": "2022-12-06T22:37:18.612Z",
                "destination": "s3://omics-artifacts-01d6xmpl4e72dd32/read-set-export/",
                "id": "1234567890",
                "sequenceStoreId": "1234567890",
                "status": "COMPLETED"
            },
            {
                "creationTime": "2022-12-06T22:38:04.871Z",
                "destination": "s3://omics-artifacts-01d6xmpl4e72dd32/read-set-export/",
                "id": "1234567890",
                "sequenceStoreId": "1234567890",
                "status": "IN_PROGRESS"
            }
        ]
    }

For more information, see `Omics Storage <https://docs.aws.amazon.com/omics/latest/dev/sequence-stores.html>`__ in the *Amazon Omics Developer Guide*.
