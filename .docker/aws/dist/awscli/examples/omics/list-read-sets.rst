**To get a list of read sets**

The following ``list-read-sets`` example gets a list of read sets for a sequence store with id ``1234567890``. ::

    aws omics list-read-sets \
        --sequence-store-id 1234567890

Output::

    {
        "readSets": [
            {
                "arn": "arn:aws:omics:us-west-2:123456789012:sequenceStore/1234567890/readSet/1234567890",
                "creationTime": "2022-11-23T21:55:00.515Z",
                "fileType": "FASTQ",
                "id": "1234567890",
                "name": "HG00146",
                "referenceArn": "arn:aws:omics:us-west-2:123456789012:referenceStore/1234567890/reference/1234567890",
                "sampleId": "fastq-sample",
                "sequenceStoreId": "1234567890",
                "status": "ACTIVE",
                "subjectId": "fastq-subject"
            }
        ]
    }

For more information, see `Omics Storage <https://docs.aws.amazon.com/omics/latest/dev/sequence-stores.html>`__ in the *Amazon Omics Developer Guide*.
