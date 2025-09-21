**To get the results of a people pathing operation**

The following ``get-person-tracking`` command displays the results of a people pathing operation that you started previously by calling ``start-person-tracking``. ::

    aws rekognition get-person-tracking  \
        --job-id 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef 

Output::

    {
        "Persons": [
            {
                "Timestamp": 500, 
                "Person": {
                    "BoundingBox": {
                        "Width": 0.4151041805744171, 
                        "Top": 0.07870370149612427, 
                        "Left": 0.0, 
                        "Height": 0.9212962985038757
                    }, 
                    "Index": 0
                }
            }, 
            {
                "Timestamp": 567, 
                "Person": {
                    "BoundingBox": {
                        "Width": 0.4755208194255829, 
                        "Top": 0.07777778059244156, 
                        "Left": 0.0, 
                        "Height": 0.9194444417953491
                    }, 
                    "Index": 0
                }
            }
        ], 
        "NextToken": "D/vRIYNyhG79ugdta3f+8cRg9oSRo+HigGOuxRiYpTn0ExnqTi1CJektVAc4HrAXDv25eHYk", 
        "JobStatus": "SUCCEEDED", 
        "VideoMetadata": {
            "Format": "QuickTime / MOV", 
            "FrameRate": 29.970617294311523, 
            "Codec": "h264", 
            "DurationMillis": 6806, 
            "FrameHeight": 1080, 
            "FrameWidth": 1920
        }
    }

For more information, see `People Pathing <https://docs.aws.amazon.com/rekognition/latest/dg/persons.html>`__ in the *Amazon Rekognition Developer Guide*.
