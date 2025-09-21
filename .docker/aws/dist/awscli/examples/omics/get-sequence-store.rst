**To view a sequence store**

The following ``get-sequence-store`` example gets details about a sequence store with ID ``1234567890``. ::

    aws omics get-sequence-store \
        --id 1234567890

Output::

    {
        "arn": "arn:aws:omics:us-east-1:123456789012:sequenceStore/1234567890",
        "creationTime": "2022-11-23T19:55:48.376Z",
        "id": "1234567890",
        "name": "my-seq-store"
    }

For more information, see `Omics Storage <https://docs.aws.amazon.com/omics/latest/dev/sequence-stores.html>`__ in the *Amazon Omics Developer Guide*.
