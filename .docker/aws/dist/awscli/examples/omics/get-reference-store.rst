**To view a reference store**

The following ``get-reference-store`` example gets details about a reference store. ::

    aws omics get-reference-store \
        --id 1234567890

Output::

    {
        "arn": "arn:aws:omics:us-west-2:123456789012:referenceStore/1234567890",
        "creationTime": "2022-09-23T23:27:20.364Z",
        "id": "1234567890",
        "name": "my-rstore-0"
    }

For more information, see `Omics Storage <https://docs.aws.amazon.com/omics/latest/dev/sequence-stores.html>`__ in the *Amazon Omics Developer Guide*.
