**To view a list of objects and folders in a specific container**

The following ``describe-object`` example displays items (objects and folders) stored in a specific container. ::

    aws mediastore-data describe-object \
        --endpoint https://aaabbbcccdddee.data.mediastore.us-west-2.amazonaws.com \
        --path /folder_name/file1234.jpg

Output::

    {
        "ContentType": "image/jpeg",
        "LastModified": "Fri, 19 Jul 2019 21:32:20 GMT",
        "ContentLength": "2307346",
        "ETag": "2aa333bbcc8d8d22d777e999c88d4aa9eeeeee4dd89ff7f555555555555da6d3"
    }

For more information, see `Viewing the Details of an Object <https://docs.aws.amazon.com/mediastore/latest/ug/objects-view-details.html>`__ in the *AWS Elemental MediaStore User Guide*.
