**To view a read set**

The following ``get-read-set-metadata`` example gets details about a read set's files. ::

    aws omics get-read-set-metadata \
        --sequence-store-id 1234567890 \
        --id 1234567890

Output::

    {
        "arn": "arn:aws:omics:us-west-2:123456789012:sequenceStore/1234567890/readSet/1234567890",
        "creationTime": "2022-11-23T21:55:00.515Z",
        "fileType": "FASTQ",
        "files": {
            "source1": {
                "contentLength": 310054739,
                "partSize": 104857600,
                "totalParts": 3
            },
            "source2": {
                "contentLength": 307846621,
                "partSize": 104857600,
                "totalParts": 3
            }
        },
        "id": "1234567890",
        "name": "HG00146",
        "referenceArn": "arn:aws:omics:us-west-2:123456789012:referenceStore/1234567890/reference/1234567890",
        "sampleId": "fastq-sample",
        "sequenceInformation": {
            "alignment": "UNALIGNED",
            "totalBaseCount": 677717384,
            "totalReadCount": 8917334
        },
        "sequenceStoreId": "1234567890",
        "status": "ACTIVE",
        "subjectId": "fastq-subject"
    }

For more information, see `Omics Storage <https://docs.aws.amazon.com/omics/latest/dev/sequence-stores.html>`__ in the *Amazon Omics Developer Guide*.
