**To import a reference genome**

The following ``start-reference-import-job`` example imports a reference genome from Amazon S3. ::

    aws omics start-reference-import-job \
        --reference-store-id 1234567890 \
        --role-arn arn:aws:iam::123456789012:role/omics-service-role-serviceRole-W8O1XMPL7QZ \
        --sources sourceFile=s3://omics-artifacts-01d6xmpl4e72dd32/Homo_sapiens_assembly38.fasta,name=assembly-38

Output::

    {
        "creationTime": "2022-11-22T22:25:41.124Z",
        "id": "1234567890",
        "referenceStoreId": "1234567890",
        "roleArn": "arn:aws:iam::123456789012:role/omics-service-role-serviceRole-W8O1XMPL7QZ",
        "status": "SUBMITTED"
    }

For more information, see `Omics Storage <https://docs.aws.amazon.com/omics/latest/dev/sequence-stores.html>`__ in the *Amazon Omics Developer Guide*.
