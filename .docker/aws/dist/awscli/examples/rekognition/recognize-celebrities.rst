**To recognize celebrities in an image**

The following ``recognize-celebrities`` command recognizes celebrities in the specified image stored in an Amazon S3 bucket.::

    aws rekognition recognize-celebrities \
        --image "S3Object={Bucket=MyImageS3Bucket,Name=moviestars.jpg}"

Output::

    {
        "UnrecognizedFaces": [
            {
                "BoundingBox": {
                    "Width": 0.14416666328907013, 
                    "Top": 0.07777778059244156, 
                    "Left": 0.625, 
                    "Height": 0.2746031880378723
                }, 
                "Confidence": 99.9990234375, 
                "Pose": {
                    "Yaw": 10.80408763885498, 
                    "Roll": -12.761146545410156, 
                    "Pitch": 10.96889877319336
                }, 
                "Quality": {
                    "Sharpness": 94.1185531616211, 
                    "Brightness": 79.18367004394531
                }, 
                "Landmarks": [
                    {
                        "Y": 0.18220913410186768, 
                        "X": 0.6702951788902283, 
                        "Type": "eyeLeft"
                    }, 
                    {
                        "Y": 0.16337193548679352, 
                        "X": 0.7188183665275574, 
                        "Type": "eyeRight"
                    }, 
                    {
                        "Y": 0.20739148557186127, 
                        "X": 0.7055801749229431, 
                        "Type": "nose"
                    }, 
                    {
                        "Y": 0.2889308035373688, 
                        "X": 0.687512218952179, 
                        "Type": "mouthLeft"
                    }, 
                    {
                        "Y": 0.2706988751888275, 
                        "X": 0.7250053286552429, 
                        "Type": "mouthRight"
                    }
                ]
            }
        ], 
        "CelebrityFaces": [
            {
                "MatchConfidence": 100.0, 
                "Face": {
                    "BoundingBox": {
                        "Width": 0.14000000059604645, 
                        "Top": 0.1190476194024086, 
                        "Left": 0.82833331823349, 
                        "Height": 0.2666666805744171
                    }, 
                    "Confidence": 99.99359130859375, 
                    "Pose": {
                        "Yaw": -10.509642601013184, 
                        "Roll": -14.51749324798584, 
                        "Pitch": 13.799399375915527
                    }, 
                    "Quality": {
                        "Sharpness": 78.74752044677734, 
                        "Brightness": 42.201324462890625
                    }, 
                    "Landmarks": [
                        {
                            "Y": 0.2290833294391632, 
                            "X": 0.8709492087364197, 
                            "Type": "eyeLeft"
                        }, 
                        {
                            "Y": 0.20639978349208832, 
                            "X": 0.9153988361358643, 
                            "Type": "eyeRight"
                        }, 
                        {
                            "Y": 0.25417643785476685, 
                            "X": 0.8907724022865295, 
                            "Type": "nose"
                        }, 
                        {
                            "Y": 0.32729196548461914, 
                            "X": 0.8876466155052185, 
                            "Type": "mouthLeft"
                        }, 
                        {
                            "Y": 0.3115464746952057, 
                            "X": 0.9238573312759399, 
                            "Type": "mouthRight"
                        }
                    ]
                }, 
                "Name": "Celeb A", 
                "Urls": [
                    "www.imdb.com/name/aaaaaaaaa"
                ], 
                "Id": "1111111"
            }, 
            {
                "MatchConfidence": 97.0, 
                "Face": {
                    "BoundingBox": {
                        "Width": 0.13333334028720856, 
                        "Top": 0.24920634925365448, 
                        "Left": 0.4449999928474426, 
                        "Height": 0.2539682686328888
                    }, 
                    "Confidence": 99.99979400634766, 
                    "Pose": {
                        "Yaw": 6.557040691375732, 
                        "Roll": -7.316643714904785, 
                        "Pitch": 9.272967338562012
                    }, 
                    "Quality": {
                        "Sharpness": 83.23492431640625, 
                        "Brightness": 78.83267974853516
                    }, 
                    "Landmarks": [
                        {
                            "Y": 0.3625510632991791, 
                            "X": 0.48898839950561523, 
                            "Type": "eyeLeft"
                        }, 
                        {
                            "Y": 0.35366007685661316, 
                            "X": 0.5313721299171448, 
                            "Type": "eyeRight"
                        }, 
                        {
                            "Y": 0.3894785940647125, 
                            "X": 0.5173314809799194, 
                            "Type": "nose"
                        }, 
                        {
                            "Y": 0.44889405369758606, 
                            "X": 0.5020005702972412, 
                            "Type": "mouthLeft"
                        }, 
                        {
                            "Y": 0.4408611059188843, 
                            "X": 0.5351271629333496, 
                            "Type": "mouthRight"
                        }
                    ]
                }, 
                "Name": "Celeb B", 
                "Urls": [
                    "www.imdb.com/name/bbbbbbbbb"
                ], 
                "Id": "2222222"
            }, 
            {
                "MatchConfidence": 100.0, 
                "Face": {
                    "BoundingBox": {
                        "Width": 0.12416666746139526, 
                        "Top": 0.2968254089355469, 
                        "Left": 0.2150000035762787, 
                        "Height": 0.23650793731212616
                    }, 
                    "Confidence": 99.99958801269531, 
                    "Pose": {
                        "Yaw": 7.801797866821289, 
                        "Roll": -8.326810836791992, 
                        "Pitch": 7.844768047332764
                    }, 
                    "Quality": {
                        "Sharpness": 86.93206024169922, 
                        "Brightness": 79.81291198730469
                    }, 
                    "Landmarks": [
                        {
                            "Y": 0.4027804136276245, 
                            "X": 0.2575301229953766, 
                            "Type": "eyeLeft"
                        }, 
                        {
                            "Y": 0.3934555947780609, 
                            "X": 0.2956969439983368, 
                            "Type": "eyeRight"
                        }, 
                        {
                            "Y": 0.4309830069541931, 
                            "X": 0.2837020754814148, 
                            "Type": "nose"
                        }, 
                        {
                            "Y": 0.48186683654785156, 
                            "X": 0.26812544465065, 
                            "Type": "mouthLeft"
                        }, 
                        {
                            "Y": 0.47338807582855225, 
                            "X": 0.29905644059181213, 
                            "Type": "mouthRight"
                        }
                    ]
                }, 
                "Name": "Celeb C", 
                "Urls": [
                    "www.imdb.com/name/ccccccccc"
                ], 
                "Id": "3333333"
            }, 
            {
                "MatchConfidence": 97.0, 
                "Face": {
                    "BoundingBox": {
                        "Width": 0.11916666477918625, 
                        "Top": 0.3698412775993347, 
                        "Left": 0.008333333767950535, 
                        "Height": 0.22698412835597992
                    }, 
                    "Confidence": 99.99999237060547, 
                    "Pose": {
                        "Yaw": 16.38478660583496, 
                        "Roll": -1.0260354280471802, 
                        "Pitch": 5.975185394287109
                    }, 
                    "Quality": {
                        "Sharpness": 83.23492431640625, 
                        "Brightness": 61.408443450927734
                    }, 
                    "Landmarks": [
                        {
                            "Y": 0.4632347822189331, 
                            "X": 0.049406956881284714, 
                            "Type": "eyeLeft"
                        }, 
                        {
                            "Y": 0.46388113498687744, 
                            "X": 0.08722897619009018, 
                            "Type": "eyeRight"
                        }, 
                        {
                            "Y": 0.5020678639411926, 
                            "X": 0.0758260041475296, 
                            "Type": "nose"
                        }, 
                        {
                            "Y": 0.544157862663269, 
                            "X": 0.054029736667871475, 
                            "Type": "mouthLeft"
                        }, 
                        {
                            "Y": 0.5463630557060242, 
                            "X": 0.08464983850717545, 
                            "Type": "mouthRight"
                        }
                    ]
                }, 
                "Name": "Celeb D", 
                "Urls": [
                    "www.imdb.com/name/ddddddddd"
                ], 
                "Id": "4444444"
            }
        ]
    }

For more information, see `Recognizing Celebrities in an Image <https://docs.aws.amazon.com/rekognition/latest/dg/celebrities-procedure-image.html>`__ in the *Amazon Rekognition Developer Guide*.
