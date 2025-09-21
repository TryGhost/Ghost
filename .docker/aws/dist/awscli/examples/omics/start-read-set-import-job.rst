**To import a read set**

The following ``start-read-set-import-job`` example imports a read set. ::

    aws omics start-read-set-import-job \
        --sequence-store-id 1234567890 \
        --role-arn arn:aws:iam::123456789012:role/omics-service-role-serviceRole-W8O1XMPL7QZ \
        --sources file://readset-sources.json

`readset-sources.json` is a JSON document with the following content. ::

    [
        {
            "sourceFiles":
            {
                "source1": "s3://omics-artifacts-01d6xmpl4e72dd32/HG00100.chrom20.ILLUMINA.bwa.GBR.low_coverage.20101123.bam"
            },
            "sourceFileType": "BAM",
            "subjectId": "bam-subject",
            "sampleId": "bam-sample",
            "referenceArn": "arn:aws:omics:us-west-2:123456789012:referenceStore/1234567890/reference/1234567890",
            "name": "HG00100"
        }
    ]

Output::

    {
        "creationTime": "2022-11-23T01:36:38.158Z",
        "id": "1234567890",
        "roleArn": "arn:aws:iam::123456789012:role/omics-service-role-serviceRole-W8O1XMPL7QZ",
        "sequenceStoreId": "1234567890",
        "status": "SUBMITTED"
    }


For more information, see `Omics Storage <https://docs.aws.amazon.com/omics/latest/dev/sequence-stores.html>`__ in the *Amazon Omics Developer Guide*.
