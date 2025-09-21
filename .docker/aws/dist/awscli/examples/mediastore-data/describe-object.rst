**To view the headers for an object**

The following ``describe-object`` example displays the headers for an object at the specified path. ::

    aws mediastore-data describe-object \
        --endpoint https://aaabbbcccdddee.data.mediastore.us-west-2.amazonaws.com \
        --path events/baseball/setup.jpg

Output::

    {
        "LastModified": "Fri, 19 Jul 2019 21:50:31 GMT",
        "ContentType": "image/jpeg",
        "ContentLength": "3860266",
        "ETag": "2aa333bbcc8d8d22d777e999c88d4aa9eeeeee4dd89ff7f555555555555da6d3"
    }

For more information, see `Viewing the Details of an Object <https://docs.aws.amazon.com/mediastore/latest/ug/objects-view-details.html>`__ in the *AWS Elemental MediaStore User Guide*.
