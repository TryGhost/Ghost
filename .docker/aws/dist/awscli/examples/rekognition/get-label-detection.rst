**To get the results of an objects and scenes detection operation**

The following ``get-label-detection`` command displays the results of an objects and scenes detection operation that you started previously by calling ``start-label-detection``. ::

    aws rekognition get-label-detection  \
        --job-id 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

Output::

    {
        "Labels": [
            {
                "Timestamp": 0, 
                "Label": {
                    "Instances": [], 
                    "Confidence": 50.19071578979492, 
                    "Parents": [
                        {
                            "Name": "Person"
                        }, 
                        {
                            "Name": "Crowd"
                        }
                    ], 
                    "Name": "Audience"
                }
            }, 
            {
                "Timestamp": 0, 
                "Label": {
                    "Instances": [], 
                    "Confidence": 55.74115753173828, 
                    "Parents": [
                        {
                            "Name": "Room"
                        }, 
                        {
                            "Name": "Indoors"
                        }, 
                        {
                            "Name": "School"
                        }
                    ], 
                    "Name": "Classroom"
                }
            }
        ], 
        "JobStatus": "SUCCEEDED", 
        "LabelModelVersion": "2.0", 
        "VideoMetadata": {
            "Format": "QuickTime / MOV", 
            "FrameRate": 29.970617294311523, 
            "Codec": "h264", 
            "DurationMillis": 6806, 
            "FrameHeight": 1080, 
            "FrameWidth": 1920
        }, 
        "NextToken": "BMugzAi4L72IERzQdbpyMQuEFBsjlo5W0Yx3mfG+sR9mm98E1/CpObenspRfs/5FBQFs4X7G"
    }

For more information, see `Detecting Labels in a Video <https://docs.aws.amazon.com/rekognition/latest/dg/labels-detecting-labels-video.html>`__ in the *Amazon Rekognition Developer Guide*.
