**To get a list of reference import jobs**

The following ``list-reference-import-jobs`` example gets a list of reference import jobs for a reference store with id ``1234567890``. ::

    aws omics list-reference-import-jobs \
        --reference-store-id 1234567890

Output::

    {
        "importJobs": [
            {
                "completionTime": "2022-11-23T19:54:58.204Z",
                "creationTime": "2022-11-23T19:53:20.729Z",
                "id": "1234567890",
                "referenceStoreId": "1234567890",
                "roleArn": "arn:aws:iam::123456789012:role/omics-service-role-serviceRole-W8O1XMPL7QZ",
                "status": "COMPLETED"
            },
            {
                "creationTime": "2022-11-23T20:34:03.250Z",
                "id": "1234567890",
                "referenceStoreId": "1234567890",
                "roleArn": "arn:aws:iam::123456789012:role/omics-service-role-serviceRole-W8O1XMPL7QZ",
                "status": "IN_PROGRESS"
            }
        ]
    }

For more information, see `Omics Storage <https://docs.aws.amazon.com/omics/latest/dev/sequence-stores.html>`__ in the *Amazon Omics Developer Guide*.
