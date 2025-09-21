**To list the available collections**

The following ``list-collections`` command lists the available collections in the AWS account. ::

    aws rekognition list-collections

Output::

    {
        "FaceModelVersions": [
            "2.0", 
            "3.0", 
            "3.0", 
            "3.0", 
            "4.0", 
            "1.0", 
            "3.0", 
            "4.0", 
            "4.0", 
            "4.0"
        ], 
        "CollectionIds": [
            "MyCollection1", 
            "MyCollection2", 
            "MyCollection3", 
            "MyCollection4", 
            "MyCollection5", 
            "MyCollection6", 
            "MyCollection7", 
            "MyCollection8", 
            "MyCollection9", 
            "MyCollection10"
        ]
    }

For more information, see `Listing Collections <https://docs.aws.amazon.com/rekognition/latest/dg/list-collection-procedure.html>`__ in the *Amazon Rekognition Developer Guide*.
