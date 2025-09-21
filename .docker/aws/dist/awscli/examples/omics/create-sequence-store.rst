**To create a sequence store**

The following ``create-sequence-store`` example creates a sequence store. ::

    aws omics create-sequence-store \
        --name my-seq-store

Output::

    {
        "arn": "arn:aws:omics:us-west-2:123456789012:sequenceStore/1234567890",
        "creationTime": "2022-11-23T01:24:33.629Z",
        "id": "1234567890",
        "name": "my-seq-store"
    }

For more information, see `Omics Storage <https://docs.aws.amazon.com/omics/latest/dev/sequence-stores.html>`__ in the *Amazon Omics Developer Guide*.
