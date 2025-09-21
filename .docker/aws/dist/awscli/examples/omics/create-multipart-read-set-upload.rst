**To begin a multipart read set upload.**

The following ``create-multipart-read-set-upload`` example initiates a multipart read set upload. ::

    aws omics create-multipart-read-set-upload \
        --sequence-store-id 0123456789 \
        --name HG00146 \
        --source-file-type FASTQ \
        --subject-id mySubject\
        --sample-id mySample\
        --description "FASTQ for HG00146"\
        --generated-from "1000 Genomes" 


Output::

    {
        "creationTime": "2022-07-13T23:25:20Z",
        "description": "FASTQ for HG00146",
        "generatedFrom": "1000 Genomes",
        "name": "HG00146",
        "sampleId": "mySample",
        "sequenceStoreId": "0123456789",
        "sourceFileType": "FASTQ",
        "subjectId": "mySubject",
        "uploadId": "1122334455"
    }

For more information, see `Direct upload to a sequence store <https://docs.aws.amazon.com/omics/latest/dev/synchronous-uploads.html>`__ in the *AWS HealthOmics User Guide*.