**To list all parts in a requested multipart upload for a sequence store.**

The following ``list-read-set-upload-parts`` example list all parts in a requested multipart upload for a sequence store. ::

    aws omics list-read-set-upload-parts \
        --sequence-store-id 0123456789 \
        --upload-id 1122334455 \
        --part-source SOURCE1  

Output::

    {
        "parts": [
            {
                "partNumber": 1,
                "partSize": 94371840,
                "file": "SOURCE1",
                "checksum": "984979b9928ae8d8622286c4a9cd8e99d964a22d59ed0f5722e1733eb280e635",
                "lastUpdatedTime": "2023-02-02T20:14:47.533000+00:00"
            }
            {
                "partNumber": 2,
                "partSize": 10471840,
                "file": "SOURCE1",
                "checksum": "984979b9928ae8d8622286c4a9cd8e99d964a22d59ed0f5722e1733eb280e635",
                "lastUpdatedTime": "2023-02-02T20:14:47.533000+00:00"
            }
          ]

    }

For more information, see `Direct upload to a sequence store <https://docs.aws.amazon.com/omics/latest/dev/synchronous-uploads.html>`__ in the *AWS HealthOmics User Guide*.