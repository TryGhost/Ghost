**To retrieves metadata from an object without returning the object itself**

The following ``get-object-attributes`` example retrieves metadata from the object ``doc1.rtf``. ::

    aws s3api get-object-attributes \
        --bucket amzn-s3-demo-bucket \
        --key doc1.rtf \
        --object-attributes "StorageClass" "ETag" "ObjectSize"

Output::

    {
        "LastModified": "2022-03-15T19:37:31+00:00",
        "VersionId": "IuCPjXTDzHNfldAuitVBIKJpF2p1fg4P",
        "ETag": "b662d79adeb7c8d787ea7eafb9ef6207",
        "StorageClass": "STANDARD",
        "ObjectSize": 405
    }

For more information, see `GetObjectAttributes <https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObjectAttributes.html>`__ in the Amazon S3 API Reference.