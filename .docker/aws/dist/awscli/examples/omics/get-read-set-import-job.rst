**To view a read set import job**

The following ``get-read-set-import-job`` example gets details about a read set import job. ::

    aws omics get-read-set-import-job \
        --sequence-store-id 1234567890 \
        --id 1234567890

Output::

    {
        "creationTime": "2022-11-23T01:36:38.158Z",
        "id": "1234567890",
        "roleArn": "arn:aws:iam::123456789012:role/omics-service-role-serviceRole-W8O1XMPL7QZ",
        "sequenceStoreId": "1234567890",
        "sources": [
            {
                "name": "HG00100",
                "referenceArn": "arn:aws:omics:us-west-2:123456789012:referenceStore/1234567890/reference/1234567890",
                "sampleId": "bam-sample",
                "sourceFileType": "BAM",
                "sourceFiles": {
                    "source1": "s3://omics-artifacts-01d6xmpl4e72dd32/HG00100.chrom20.ILLUMINA.bwa.GBR.low_coverage.20101123.bam",
                    "source2": ""
                },
                "status": "IN_PROGRESS",
                "statusMessage": "The source job is currently in progress.",
                "subjectId": "bam-subject",
                "tags": {
                    "aws:omics:sampleId": "bam-sample",
                    "aws:omics:subjectId": "bam-subject"
                }
            },
            {
                "name": "HG00146",
                "referenceArn": "arn:aws:omics:us-west-2:123456789012:referenceStore/1234567890/reference/1234567890",
                "sampleId": "fastq-sample",
                "sourceFileType": "FASTQ",
                "sourceFiles": {
                    "source1": "s3://omics-artifacts-01d6xmpl4e72dd32/SRR233106_1.filt.fastq.gz",
                    "source2": "s3://omics-artifacts-01d6xmpl4e72dd32/SRR233106_2.filt.fastq.gz"
                },
                "status": "IN_PROGRESS",
                "statusMessage": "The source job is currently in progress.",
                "subjectId": "fastq-subject",
                "tags": {
                    "aws:omics:sampleId": "fastq-sample",
                    "aws:omics:subjectId": "fastq-subject"
                }
            },
            {
                "name": "HG00096",
                "referenceArn": "arn:aws:omics:us-west-2:123456789012:referenceStore/1234567890/reference/1234567890",
                "sampleId": "cram-sample",
                "sourceFileType": "CRAM",
                "sourceFiles": {
                    "source1": "s3://omics-artifacts-01d6xmpl4e72dd32/HG00096.alt_bwamem_GRCh38DH.20150718.GBR.low_coverage.cram",
                    "source2": ""
                },
                "status": "IN_PROGRESS",
                "statusMessage": "The source job is currently in progress.",
                "subjectId": "cram-subject",
                "tags": {
                    "aws:omics:sampleId": "cram-sample",
                    "aws:omics:subjectId": "cram-subject"
                }
            }
        ],
        "status": "IN_PROGRESS",
        "statusMessage": "The job is currently in progress."
    }

For more information, see `Omics Storage <https://docs.aws.amazon.com/omics/latest/dev/sequence-stores.html>`__ in the *Amazon Omics Developer Guide*.
