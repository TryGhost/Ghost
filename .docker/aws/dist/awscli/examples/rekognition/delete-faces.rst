**To delete faces from a collection**

The following ``delete-faces`` command deletes the specified face from a collection. ::

    aws rekognition delete-faces \
        --collection-id MyCollection
        --face-ids '["0040279c-0178-436e-b70a-e61b074e96b0"]' 

Output::

    {
        "DeletedFaces": [
            "0040279c-0178-436e-b70a-e61b074e96b0"
        ]
    }

For more information, see `Deleting Faces from a Collection <https://docs.aws.amazon.com/rekognition/latest/dg/delete-faces-procedure.html>`__ in the *Amazon Rekognition Developer Guide*.
