**To get the results of a celebrity recognition operation**

The following ``get-celebrity-recognition`` command diplays the results of a celebrity recognition operation that you started previously by calling ``start-celebrity-recognition``. ::

    aws rekognition get-celebrity-recognition  \
        --job-id 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

Output::

    {
        "NextToken": "3D01ClxlCiT31VsRDkAO3IybLb/h5AtDWSGuhYi+N1FIJwwPtAkuKzDhL2rV3GcwmNt77+12", 
        "Celebrities": [
            {
                "Timestamp": 0, 
                "Celebrity": {
                    "Confidence": 96.0, 
                    "Face": {
                        "BoundingBox": {
                            "Width": 0.70333331823349, 
                            "Top": 0.16750000417232513, 
                            "Left": 0.19555555284023285, 
                            "Height": 0.3956249952316284
                        }, 
                        "Landmarks": [
                            {
                                "Y": 0.31031012535095215, 
                                "X": 0.441436767578125, 
                                "Type": "eyeLeft"
                            }, 
                            {
                                "Y": 0.3081788718700409, 
                                "X": 0.6437258720397949, 
                                "Type": "eyeRight"
                            }, 
                            {
                                "Y": 0.39542075991630554, 
                                "X": 0.5572493076324463, 
                                "Type": "nose"
                            }, 
                            {
                                "Y": 0.4597957134246826, 
                                "X": 0.4579732120037079, 
                                "Type": "mouthLeft"
                            }, 
                            {
                                "Y": 0.45688048005104065, 
                                "X": 0.6349081993103027, 
                                "Type": "mouthRight"
                            }
                        ], 
                        "Pose": {
                            "Yaw": 8.943398475646973, 
                            "Roll": -2.0309247970581055, 
                            "Pitch": -0.5674862861633301
                        }, 
                        "Quality": {
                            "Sharpness": 99.40211486816406, 
                            "Brightness": 89.47132110595703
                        }, 
                        "Confidence": 99.99861145019531
                    }, 
                    "Name": "CelebrityA", 
                    "Urls": [
                        "www.imdb.com/name/111111111"
                    ], 
                    "Id": "nnnnnn"
                }
            }, 
            {
                "Timestamp": 467, 
                "Celebrity": {
                    "Confidence": 99.0, 
                    "Face": {
                        "BoundingBox": {
                            "Width": 0.6877777576446533, 
                            "Top": 0.18437500298023224, 
                            "Left": 0.20555555820465088, 
                            "Height": 0.3868750035762787
                        }, 
                        "Landmarks": [
                            {
                                "Y": 0.31895750761032104, 
                                "X": 0.4411413371562958, 
                                "Type": "eyeLeft"
                            }, 
                            {
                                "Y": 0.3140959143638611, 
                                "X": 0.6523157954216003, 
                                "Type": "eyeRight"
                            }, 
                            {
                                "Y": 0.4016456604003906, 
                                "X": 0.5682755708694458, 
                                "Type": "nose"
                            }, 
                            {
                                "Y": 0.46894142031669617, 
                                "X": 0.4597797095775604, 
                                "Type": "mouthLeft"
                            }, 
                            {
                                "Y": 0.46971091628074646, 
                                "X": 0.6286435127258301, 
                                "Type": "mouthRight"
                            }
                        ], 
                        "Pose": {
                            "Yaw": 10.433465957641602, 
                            "Roll": -3.347442388534546, 
                            "Pitch": 1.3709543943405151
                        }, 
                        "Quality": {
                            "Sharpness": 99.5531005859375, 
                            "Brightness": 88.5764389038086
                        }, 
                        "Confidence": 99.99148559570312
                    }, 
                    "Name": "Jane Celebrity", 
                    "Urls": [
                        "www.imdb.com/name/111111111"
                    ], 
                    "Id": "nnnnnn"
                }
            }
        ], 
        "JobStatus": "SUCCEEDED", 
        "VideoMetadata": {
            "Format": "QuickTime / MOV", 
            "FrameRate": 29.978118896484375, 
            "Codec": "h264", 
            "DurationMillis": 4570, 
            "FrameHeight": 1920, 
            "FrameWidth": 1080
        }
    }

For more information, see `Recognizing Celebrities in a Stored Video <https://docs.aws.amazon.com/rekognition/latest/dg/celebrities-video-sqs.html>`__ in the *Amazon Rekognition Developer Guide*.
