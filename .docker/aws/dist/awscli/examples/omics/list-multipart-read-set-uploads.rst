**To list all multipart read set uploads and their statuses.**

The following ``list-multipart-read-set-uploads`` example lists all multipart read set uploads and their statuses. ::

    aws omics list-multipart-read-set-uploads \
        --sequence-store-id 0123456789 

Output::

    {
    "uploads": 
        [
            {
               "sequenceStoreId": "0123456789",
               "uploadId": "8749584421",
               "sourceFileType": "FASTQ",
                "subjectId": "mySubject",
                "sampleId": "mySample",
                "generatedFrom": "1000 Genomes",
                "name": "HG00146",
                "description": "FASTQ for HG00146",
                "creationTime": "2023-11-29T19:22:51.349298+00:00"
            },
            {
                "sequenceStoreId": "0123456789",
                "uploadId": "5290538638",
                "sourceFileType": "BAM",
                "subjectId": "mySubject",
                "sampleId": "mySample",
                "generatedFrom": "1000 Genomes",
                "referenceArn": "arn:aws:omics:us-west-2:845448930428:referenceStore/8168613728/reference/2190697383",
                "name": "HG00146",
                "description": "BAM for HG00146",
                "creationTime": "2023-11-29T19:23:33.116516+00:00"
            },
            {
                "sequenceStoreId": "0123456789",
                "uploadId": "4174220862",
                "sourceFileType": "BAM",
                "subjectId": "mySubject",
                "sampleId": "mySample",
                "generatedFrom": "1000 Genomes",
                "referenceArn": "arn:aws:omics:us-west-2:845448930428:referenceStore/8168613728/reference/2190697383",
                "name": "HG00147",
                "description": "BAM for HG00147",
                "creationTime": "2023-11-29T19:23:47.007866+00:00"
            }
        ]
    }

For more information, see `Direct upload to a sequence store <https://docs.aws.amazon.com/omics/latest/dev/synchronous-uploads.html>`__ in the *AWS HealthOmics User Guide*.