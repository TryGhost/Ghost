**To view a reference import job**

The following ``get-reference-import-job`` example example gets details about a reference import job. ::

    aws omics get-reference-import-job \
        --reference-store-id 1234567890 \
        --id 1234567890

Output::

    {
        "creationTime": "2022-11-22T22:25:41.124Z",
        "id": "1234567890",
        "referenceStoreId": "1234567890",
        "roleArn": "arn:aws:iam::123456789012:role/omics-service-role-serviceRole-W8O1XMPL7QZ",
        "sources": [
            {
                "name": "assembly-38",
                "sourceFile": "s3://omics-artifacts-01d6xmpl4e72dd32/Homo_sapiens_assembly38.fasta",
                "status": "IN_PROGRESS",
                "statusMessage": "The source job is currently in progress."
            }
        ],
        "status": "IN_PROGRESS",
        "statusMessage": "The job is currently in progress."
    }

For more information, see `Omics Storage <https://docs.aws.amazon.com/omics/latest/dev/sequence-stores.html>`__ in the *Amazon Omics Developer Guide*.
