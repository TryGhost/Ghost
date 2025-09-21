**To create a reference store**

The following ``create-reference-store`` example creates a reference store ``my-ref-store``. ::

    aws omics create-reference-store \
        --name my-ref-store

Output::

    {
        "arn": "arn:aws:omics:us-west-2:123456789012:referenceStore/1234567890",
        "creationTime": "2022-11-22T22:13:25.947Z",
        "id": "1234567890",
        "name": "my-ref-store"
    }

For more information, see `Omics Storage <https://docs.aws.amazon.com/omics/latest/dev/sequence-stores.html>`__ in the *Amazon Omics Developer Guide*.
