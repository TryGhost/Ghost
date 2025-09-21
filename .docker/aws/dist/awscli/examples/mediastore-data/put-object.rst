**Example 1: To upload an object to a container**

The following ``put-object`` example upload an object to the specified container. ::

    aws mediastore-data put-object \
        --endpoint https://aaabbbcccdddee.data.mediastore.us-west-2.amazonaws.com \
        --body ReadMe.md \
        --path ReadMe.md \
        --cache-control "max-age=6, public" \
        --content-type binary/octet-stream

Output::

    {
        "ContentSHA256": "f29bc64a9d3732b4b9035125fdb3285f5b6455778edca72414671e0ca3b2e0de",
        "StorageClass": "TEMPORAL",
        "ETag": "2aa333bbcc8d8d22d777e999c88d4aa9eeeeee4dd89ff7f555555555555da6d3"
    }

**Example 2: To upload an object to a folder within a container**

The following ``put-object`` example upload an object to the specified folder within a container. ::

    aws mediastore-data put-object \
        --endpoint https://aaabbbcccdddee.data.mediastore.us-west-2.amazonaws.com \
        --body ReadMe.md \
        --path /september-events/ReadMe.md \
        --cache-control "max-age=6, public" \
        --content-type binary/octet-stream

Output::

    {
        "ETag": "2aa333bbcc8d8d22d777e999c88d4aa9eeeeee4dd89ff7f555555555555da6d3",
        "ContentSHA256": "f29bc64a9d3732b4b9035125fdb3285f5b6455778edca72414671e0ca3b2e0de",
        "StorageClass": "TEMPORAL"
    }

For more information, see `Uploading an Object <https://docs.aws.amazon.com/mediastore/latest/ug/objects-upload.html>`__ in the *AWS Elemental MediaStore User Guide*.
