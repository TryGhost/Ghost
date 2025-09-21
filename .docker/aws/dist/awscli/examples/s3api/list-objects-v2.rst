**To get a list of objects in a bucket**

The following ``list-objects-v2`` example lists the objects in the specified bucket. ::

    aws s3api list-objects-v2 \
        --bucket amzn-s3-demo-bucket

Output::

    {
        "Contents": [
            {
                "LastModified": "2019-11-05T23:11:50.000Z",
                "ETag": "\"621503c373607d548b37cff8778d992c\"",
                "StorageClass": "STANDARD",
                "Key": "doc1.rtf",
                "Size": 391
            },
            {
                "LastModified": "2019-11-05T23:11:50.000Z",
                "ETag": "\"a2cecc36ab7c7fe3a71a273b9d45b1b5\"",
                "StorageClass": "STANDARD",
                "Key": "doc2.rtf",
                "Size": 373
            },
            {
                "LastModified": "2019-11-05T23:11:50.000Z",
                "ETag": "\"08210852f65a2e9cb999972539a64d68\"",
                "StorageClass": "STANDARD",
                "Key": "doc3.rtf",
                "Size": 399
            },
            {
                "LastModified": "2019-11-05T23:11:50.000Z",
                "ETag": "\"d1852dd683f404306569471af106988e\"",
                "StorageClass": "STANDARD",
                "Key": "doc4.rtf",
                "Size": 6225
            }
        ]
    }
