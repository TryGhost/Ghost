**Example 1: To view a list of objects and folders in a specific container**

The following ``list-items`` example displays items (objects and folders) stored in the specified container. ::

    aws mediastore-data list-items \
        --endpoint https://aaabbbcccdddee.data.mediastore.us-west-2.amazonaws.com

Output::

    {
        "Items": [
            {
                "ContentType": "image/jpeg",
                "LastModified": 1563571859.379,
                "Name": "filename.jpg",
                "Type": "OBJECT",
                "ETag": "543ab21abcd1a234ab123456a1a2b12345ab12abc12a1234abc1a2bc12345a12",
                "ContentLength": 3784
            },
            {
                "Type": "FOLDER",
                "Name": "ExampleLiveDemo"
            }
        ]
    }

**Example 2: To view a list of objects and folders in a specific folder**

The following ``list-items`` example displays items (objects and folders) stored in a specific folder. ::

    aws mediastore-data list-items \
        --endpoint https://aaabbbcccdddee.data.mediastore.us-west-2.amazonaws.com

Output::

    {
        "Items": [
            {
                "ContentType": "image/jpeg",
                "LastModified": 1563571859.379,
                "Name": "filename.jpg",
                "Type": "OBJECT",
                "ETag": "543ab21abcd1a234ab123456a1a2b12345ab12abc12a1234abc1a2bc12345a12",
                "ContentLength": 3784
            },
            {
                "Type": "FOLDER",
                "Name": "ExampleLiveDemo"
            }
        ]
    }

For more information, see `Viewing a List of Objects <https://docs.aws.amazon.com/mediastore/latest/ug/objects-view-list.html>`__ in the *AWS Elemental MediaStore User Guide*.
