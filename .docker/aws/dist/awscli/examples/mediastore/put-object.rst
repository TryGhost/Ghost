**To upload an object**

The following ``put-object`` example uploads an object to the specified container. You can specify a folder path where the object will be saved within the container. If the folder already exists, AWS Elemental MediaStore stores the object in the folder. If the folder doesn't exist, the service creates it, and then stores the object in the folder. ::

    aws mediastore-data put-object \
        --endpoint https://aaabbbcccdddee.data.mediastore.us-west-2.amazonaws.com \
        --body README.md \
        --path /folder_name/README.md \
        --cache-control "max-age=6, public" \
        --content-type binary/octet-stream

Output::

    {
        "ContentSHA256": "74b5fdb517f423ed750ef214c44adfe2be36e37d861eafe9c842cbe1bf387a9d",
        "StorageClass": "TEMPORAL",
        "ETag": "af3e4731af032167a106015d1f2fe934e68b32ed1aa297a9e325f5c64979277b"
    }

For more information, see `Uploading an Object <https://docs.aws.amazon.com/mediastore/latest/ug/objects-upload.html>`__ in the *AWS Elemental MediaStore User Guide*.
