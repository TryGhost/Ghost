**To get a list of reference stores**

The following ``list-reference-stores`` example gets a list of reference stores. ::

    aws omics list-reference-stores

Output::

    {
        "referenceStores": [
            {
                "arn": "arn:aws:omics:us-west-2:123456789012:referenceStore/1234567890",
                "creationTime": "2022-11-22T22:13:25.947Z",
                "id": "1234567890",
                "name": "my-ref-store"
            }
        ]
    }

For more information, see `Omics Storage <https://docs.aws.amazon.com/omics/latest/dev/sequence-stores.html>`__ in the *Amazon Omics Developer Guide*.
