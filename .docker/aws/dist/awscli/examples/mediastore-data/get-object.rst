**Example 1: To download an entire object**

The following ``get-object`` example downloads the specified object. ::

    aws mediastore-data get-object \
        --endpoint https://aaabbbcccdddee.data.mediastore.us-west-2.amazonaws.com \
        --path events/baseball/setup.jpg setup.jpg

Output::

    {
        "ContentType": "image/jpeg",
        "StatusCode": 200,
        "ETag": "2aa333bbcc8d8d22d777e999c88d4aa9eeeeee4dd89ff7f555555555555da6d3",
        "ContentLength": "3860266",
        "LastModified": "Fri, 19 Jul 2019 21:50:31 GMT"
    }

**Example 2: To download part of an object**

The following ``get-object`` example downloads the specified part of an object. ::

    aws mediastore-data get-object \
        --endpoint https://aaabbbcccdddee.data.mediastore.us-west-2.amazonaws.com \
        --path events/baseball/setup.jpg setup.jpg \
        --range "bytes=0-100"

Output::

    {
        "StatusCode": 206,
        "LastModified": "Fri, 19 Jul 2019 21:50:31 GMT",
        "ContentType": "image/jpeg",
        "ContentRange": "bytes 0-100/3860266",
        "ETag": "2aa333bbcc8d8d22d777e999c88d4aa9eeeeee4dd89ff7f555555555555da6d3",
        "ContentLength": "101"
    }

For more information, see `Downloading an Object <https://docs.aws.amazon.com/mediastore/latest/ug/objects-download.html>`__ in the *AWS Elemental MediaStore User Guide*.
