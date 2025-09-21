**To get a list of read set import jobs**

The following ``list-read-set-import-jobs`` example gets a list of import jobs for a sequence store with id ``1234567890``. ::

    aws omics list-read-set-import-jobs \
        --sequence-store-id 1234567890

Output::

    {
        "importJobs": [
            {
                "completionTime": "2022-11-29T18:17:49.244Z",
                "creationTime": "2022-11-29T17:32:47.700Z",
                "id": "1234567890",
                "roleArn": "arn:aws:iam::123456789012:role/omics-service-role-serviceRole-W8O1XMPL7QZ",
                "sequenceStoreId": "1234567890",
                "status": "COMPLETED"
            },
            {
                "completionTime": "2022-11-23T22:01:34.090Z",
                "creationTime": "2022-11-23T21:52:43.289Z",
                "id": "1234567890",
                "roleArn": "arn:aws:iam::123456789012:role/omics-service-role-serviceRole-W8O1XMPL7QZ",
                "sequenceStoreId": "1234567890",
                "status": "COMPLETED_WITH_FAILURES"
            }
        ]
    }

For more information, see `Omics Storage <https://docs.aws.amazon.com/omics/latest/dev/sequence-stores.html>`__ in the *Amazon Omics Developer Guide*.
