**To get the results of a face search operation**

The following ``get-face-search`` command displays the results of a face search operation that you started previously by calling ``start-face-search``. ::

    aws rekognition get-face-search  \
        --job-id 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef 

Output::

    {
        "Persons": [
            {
                "Timestamp": 467, 
                "FaceMatches": [], 
                "Person": {
                    "Index": 0, 
                    "Face": {
                        "BoundingBox": {
                            "Width": 0.1560753583908081, 
                            "Top": 0.13555361330509186, 
                            "Left": -0.0952017530798912, 
                            "Height": 0.6934483051300049
                        }, 
                        "Landmarks": [
                            {
                                "Y": 0.4013825058937073, 
                                "X": -0.041750285774469376, 
                                "Type": "eyeLeft"
                            }, 
                            {
                                "Y": 0.41695496439933777, 
                                "X": 0.027979329228401184, 
                                "Type": "eyeRight"
                            }, 
                            {
                                "Y": 0.6375303268432617, 
                                "X": -0.04034662991762161, 
                                "Type": "mouthLeft"
                            }, 
                            {
                                "Y": 0.6497718691825867, 
                                "X": 0.013960429467260838, 
                                "Type": "mouthRight"
                            }, 
                            {
                                "Y": 0.5238034129142761, 
                                "X": 0.008022055961191654, 
                                "Type": "nose"
                            }
                        ], 
                        "Pose": {
                            "Yaw": -58.07863998413086, 
                            "Roll": 1.9384294748306274, 
                            "Pitch": -24.66305160522461
                        }, 
                        "Quality": {
                            "Sharpness": 83.14741516113281, 
                            "Brightness": 25.75942611694336
                        }, 
                        "Confidence": 87.7622299194336
                    }
                }
            }, 
            {
                "Timestamp": 967, 
                "FaceMatches": [
                    {
                        "Face": {
                            "BoundingBox": {
                                "Width": 0.12368900328874588, 
                                "Top": 0.16007399559020996, 
                                "Left": 0.5901259779930115, 
                                "Height": 0.2514039874076843
                            }, 
                            "FaceId": "056a95fa-2060-4159-9cab-7ed4daa030fa", 
                            "ExternalImageId": "image3.jpg", 
                            "Confidence": 100.0, 
                            "ImageId": "08f8a078-8929-37fd-8e8f-aadf690e8232"
                        }, 
                        "Similarity": 98.44476318359375
                    }
                ], 
                "Person": {
                    "Index": 1, 
                    "Face": {
                        "BoundingBox": {
                            "Width": 0.28559377789497375, 
                            "Top": 0.19436298310756683, 
                            "Left": 0.024553587660193443, 
                            "Height": 0.7216082215309143
                        }, 
                        "Landmarks": [
                            {
                                "Y": 0.4650231599807739, 
                                "X": 0.16269078850746155, 
                                "Type": "eyeLeft"
                            }, 
                            {
                                "Y": 0.4843238294124603, 
                                "X": 0.2782580852508545, 
                                "Type": "eyeRight"
                            }, 
                            {
                                "Y": 0.71530681848526, 
                                "X": 0.1741468608379364, 
                                "Type": "mouthLeft"
                            }, 
                            {
                                "Y": 0.7310671210289001, 
                                "X": 0.26857468485832214, 
                                "Type": "mouthRight"
                            }, 
                            {
                                "Y": 0.582602322101593, 
                                "X": 0.2566150426864624, 
                                "Type": "nose"
                            }
                        ], 
                        "Pose": {
                            "Yaw": 11.487052917480469, 
                            "Roll": 5.074230670928955, 
                            "Pitch": 15.396159172058105
                        }, 
                        "Quality": {
                            "Sharpness": 73.32209777832031, 
                            "Brightness": 54.96497344970703
                        }, 
                        "Confidence": 99.99998474121094
                    }
                }
            }
        ], 
        "NextToken": "5bkgcezyuaqhtWk3C8OTW6cjRghrwV9XDMivm5B3MXm+Lv6G+L+GejyFHPhoNa/ldXIC4c/d", 
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

For more information, see `Searching Stored Videos for Faces <https://docs.aws.amazon.com/rekognition/latest/dg/procedure-person-search-videos.html>`__ in the *Amazon Rekognition Developer Guide*.
