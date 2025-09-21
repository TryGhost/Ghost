**To upload a read set part.**

The following ``upload-read-set-part`` example uploads a specified part of a read set. ::

    aws omics upload-read-set-part \
        --sequence-store-id 0123456789 \
        --upload-id 1122334455 \
        --part-source SOURCE1 \
        --part-number 1 \
        --payload /path/to/file/read_1_part_1.fastq.gz  

Output::

    {
        "checksum": "984979b9928ae8d8622286c4a9cd8e99d964a22d59ed0f5722e1733eb280e635"
    }

For more information, see `Direct upload to a sequence store <https://docs.aws.amazon.com/omics/latest/dev/synchronous-uploads.html>`__ in the *AWS HealthOmics User Guide*.