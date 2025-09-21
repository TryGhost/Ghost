**To describe a collection**

The following ``describe-collection`` example displays the details about the specified collection. ::

    aws rekognition describe-collection \
        --collection-id MyCollection

Output::

    {
        "FaceCount": 200, 
        "CreationTimestamp": 1569444828.274, 
        "CollectionARN": "arn:aws:rekognition:us-west-2:123456789012:collection/MyCollection", 
        "FaceModelVersion": "4.0"
    }

For more information, see `Describing a Collection <https://docs.aws.amazon.com/rekognition/latest/dg/describe-collection-procedure.html>`__ in the *Amazon Rekognition Developer Guide*.
