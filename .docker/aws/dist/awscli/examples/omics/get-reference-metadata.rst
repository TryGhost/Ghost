**To view a reference**

The following ``get-reference-metadata`` example gets details about a reference. ::

    aws omics get-reference-metadata \
        --reference-store-id 1234567890 \
        --id 1234567890

Output::

    {
        "arn": "arn:aws:omics:us-west-2:123456789012:referenceStore/1234567890/reference/1234567890",
        "creationTime": "2022-11-22T22:27:09.033Z",
        "files": {
            "index": {
                "contentLength": 160928,
                "partSize": 104857600,
                "totalParts": 1
            },
            "source": {
                "contentLength": 3249912778,
                "partSize": 104857600,
                "totalParts": 31
            }
        },
        "id": "1234567890",
        "md5": "7ff134953dcca8c8997453bbb80b6b5e",
        "name": "assembly-38",
        "referenceStoreId": "1234567890",
        "status": "ACTIVE",
        "updateTime": "2022-11-22T22:27:09.033Z"
    }

For more information, see `Omics Storage <https://docs.aws.amazon.com/omics/latest/dev/sequence-stores.html>`__ in the *Amazon Omics Developer Guide*.
