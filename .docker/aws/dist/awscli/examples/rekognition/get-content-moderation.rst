**To get the results of an unsafe content operation**

The following ``get-content-moderation`` command displays the results of an unsafe content operation that you started previously by calling ``start-content-moderation``. ::

    aws rekognition get-content-moderation \
        --job-id 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

Output::

    {
        "NextToken": "dlhcKMHMzpCBGFukz6IO3JMcWiJAamCVhXHt3r6b4b5Tfbyw3q7o+Jeezt+ZpgfOnW9FCCgQ", 
        "ModerationLabels": [
            {
                "Timestamp": 0, 
                "ModerationLabel": {
                    "Confidence": 97.39583587646484, 
                    "ParentName": "", 
                    "Name": "Violence"
                }
            }, 
            {
                "Timestamp": 0, 
                "ModerationLabel": {
                    "Confidence": 97.39583587646484, 
                    "ParentName": "Violence", 
                    "Name": "Weapon Violence"
                }
            }
        ], 
        "JobStatus": "SUCCEEDED", 
        "VideoMetadata": {
            "Format": "QuickTime / MOV", 
            "FrameRate": 29.97515869140625, 
            "Codec": "h264", 
            "DurationMillis": 6039, 
            "FrameHeight": 1920, 
            "FrameWidth": 1080
        }
    }

For more information, see `Detecting Unsafe Stored Videos <https://docs.aws.amazon.com/rekognition/latest/dg/procedure-moderate-videos.html>`__ in the *Amazon Rekognition Developer Guide*.
