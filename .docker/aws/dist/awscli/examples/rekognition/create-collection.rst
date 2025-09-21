**To create a collection**

The following ``create-collection`` command creates a collection with the specified name. ::

    aws rekognition create-collection \
        --collection-id "MyCollection"

Output::

    {
        "CollectionArn": "aws:rekognition:us-west-2:123456789012:collection/MyCollection", 
        "FaceModelVersion": "4.0", 
        "StatusCode": 200
    }

For more information, see `Creating a Collection <https://docs.aws.amazon.com/rekognition/latest/dg/create-collection-procedure.html>`__ in the *Amazon Rekognition Developer Guide*.
