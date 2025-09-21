**To download an object**

The following ``get-object`` example download an object to the specified endpoint. ::

    aws mediastore-data get-object \
        --endpoint https://aaabbbcccdddee.data.mediastore.us-west-2.amazonaws.com \
        --path=/folder_name/README.md README.md

Output::

    {
        "ContentLength": "2307346",
        "ContentType": "image/jpeg",
        "LastModified": "Fri, 19 Jul 2019 21:32:20 GMT",
        "ETag": "2aa333bbcc8d8d22d777e999c88d4aa9eeeeee4dd89ff7f555555555555da6d3",
        "StatusCode": 200
    }

**To download part of an object**

The following ``get-object`` example downloads a portion an object to the specified endpoint. ::

    aws mediastore-data get-object \
        --endpoint https://aaabbbcccdddee.data.mediastore.us-west-2.amazonaws.com \
        --path /folder_name/README.md \
        --range="bytes=0-100" README2.md 

Output::

    {
        "StatusCode": 206,
        "ContentRange": "bytes 0-100/2307346",
        "ContentLength": "101",
        "LastModified": "Fri, 19 Jul 2019 21:32:20 GMT",
        "ContentType": "image/jpeg",
        "ETag": "2aa333bbcc8d8d22d777e999c88d4aa9eeeeee4dd89ff7f555555555555da6d3"
    }

For more information, see `Downloading an Object <https://docs.aws.amazon.com/mediastore/latest/ug/objects-download.html>`__ in the *AWS Elemental MediaStore User Guide*.
