**To add faces to a collection**

The following ``index-faces`` command adds the faces found in an image to the specified collection. ::

    aws rekognition index-faces \
        --image '{"S3Object":{"Bucket":"MyVideoS3Bucket","Name":"MyPicture.jpg"}}' \
        --collection-id MyCollection \
        --max-faces 1 \
        --quality-filter "AUTO" \
        --detection-attributes "ALL" \
        --external-image-id "MyPicture.jpg" 

Output::

    {
        "FaceRecords": [
            {
                "FaceDetail": {
                    "Confidence": 99.993408203125, 
                    "Eyeglasses": {
                        "Confidence": 99.11750030517578, 
                        "Value": false
                    }, 
                    "Sunglasses": {
                        "Confidence": 99.98249053955078, 
                        "Value": false
                    }, 
                    "Gender": {
                        "Confidence": 99.92769622802734, 
                        "Value": "Male"
                    }, 
                    "Landmarks": [
                        {
                            "Y": 0.26750367879867554, 
                            "X": 0.6202793717384338, 
                            "Type": "eyeLeft"
                        }, 
                        {
                            "Y": 0.26642778515815735, 
                            "X": 0.6787431836128235, 
                            "Type": "eyeRight"
                        }, 
                        {
                            "Y": 0.31361380219459534, 
                            "X": 0.6421601176261902, 
                            "Type": "nose"
                        }, 
                        {
                            "Y": 0.3495299220085144, 
                            "X": 0.6216195225715637, 
                            "Type": "mouthLeft"
                        }, 
                        {
                            "Y": 0.35194727778434753, 
                            "X": 0.669899046421051, 
                            "Type": "mouthRight"
                        }, 
                        {
                            "Y": 0.26844894886016846, 
                            "X": 0.6210268139839172, 
                            "Type": "leftPupil"
                        }, 
                        {
                            "Y": 0.26707562804222107, 
                            "X": 0.6817160844802856, 
                            "Type": "rightPupil"
                        }, 
                        {
                            "Y": 0.24834522604942322, 
                            "X": 0.6018546223640442, 
                            "Type": "leftEyeBrowLeft"
                        }, 
                        {
                            "Y": 0.24397172033786774, 
                            "X": 0.6172008514404297, 
                            "Type": "leftEyeBrowUp"
                        }, 
                        {
                            "Y": 0.24677404761314392, 
                            "X": 0.6339119076728821, 
                            "Type": "leftEyeBrowRight"
                        }, 
                        {
                            "Y": 0.24582654237747192, 
                            "X": 0.6619398593902588, 
                            "Type": "rightEyeBrowLeft"
                        }, 
                        {
                            "Y": 0.23973053693771362, 
                            "X": 0.6804757118225098, 
                            "Type": "rightEyeBrowUp"
                        }, 
                        {
                            "Y": 0.24441994726657867, 
                            "X": 0.6978968977928162, 
                            "Type": "rightEyeBrowRight"
                        }, 
                        {
                            "Y": 0.2695908546447754, 
                            "X": 0.6085202693939209, 
                            "Type": "leftEyeLeft"
                        }, 
                        {
                            "Y": 0.26716896891593933, 
                            "X": 0.6315826177597046, 
                            "Type": "leftEyeRight"
                        }, 
                        {
                            "Y": 0.26289820671081543, 
                            "X": 0.6202316880226135, 
                            "Type": "leftEyeUp"
                        }, 
                        {
                            "Y": 0.27123287320137024, 
                            "X": 0.6205548048019409, 
                            "Type": "leftEyeDown"
                        }, 
                        {
                            "Y": 0.2668408751487732, 
                            "X": 0.6663622260093689, 
                            "Type": "rightEyeLeft"
                        }, 
                        {
                            "Y": 0.26741549372673035, 
                            "X": 0.6910083889961243, 
                            "Type": "rightEyeRight"
                        }, 
                        {
                            "Y": 0.2614026665687561, 
                            "X": 0.6785826086997986, 
                            "Type": "rightEyeUp"
                        }, 
                        {
                            "Y": 0.27075251936912537, 
                            "X": 0.6789616942405701, 
                            "Type": "rightEyeDown"
                        }, 
                        {
                            "Y": 0.3211299479007721, 
                            "X": 0.6324167847633362, 
                            "Type": "noseLeft"
                        }, 
                        {
                            "Y": 0.32276326417922974, 
                            "X": 0.6558475494384766, 
                            "Type": "noseRight"
                        }, 
                        {
                            "Y": 0.34385165572166443, 
                            "X": 0.6444970965385437, 
                            "Type": "mouthUp"
                        }, 
                        {
                            "Y": 0.3671635091304779, 
                            "X": 0.6459195017814636, 
                            "Type": "mouthDown"
                        }
                    ], 
                    "Pose": {
                        "Yaw": -9.54541015625, 
                        "Roll": -0.5709401965141296, 
                        "Pitch": 0.6045494675636292
                    }, 
                    "Emotions": [
                        {
                            "Confidence": 39.90074157714844, 
                            "Type": "HAPPY"
                        }, 
                        {
                            "Confidence": 23.38753890991211, 
                            "Type": "CALM"
                        }, 
                        {
                            "Confidence": 5.840933322906494, 
                            "Type": "CONFUSED"
                        }
                    ], 
                    "AgeRange": {
                        "High": 63, 
                        "Low": 45
                    }, 
                    "EyesOpen": {
                        "Confidence": 99.80887603759766, 
                        "Value": true
                    }, 
                    "BoundingBox": {
                        "Width": 0.18562500178813934, 
                        "Top": 0.1618015021085739, 
                        "Left": 0.5575000047683716, 
                        "Height": 0.24770642817020416
                    }, 
                    "Smile": {
                        "Confidence": 99.69740295410156, 
                        "Value": false
                    }, 
                    "MouthOpen": {
                        "Confidence": 99.97393798828125, 
                        "Value": false
                    }, 
                    "Quality": {
                        "Sharpness": 95.54405975341797, 
                        "Brightness": 63.867706298828125
                    }, 
                    "Mustache": {
                        "Confidence": 97.05007934570312, 
                        "Value": false
                    }, 
                    "Beard": {
                        "Confidence": 87.34505462646484, 
                        "Value": false
                    }
                }, 
                "Face": {
                    "BoundingBox": {
                        "Width": 0.18562500178813934, 
                        "Top": 0.1618015021085739, 
                        "Left": 0.5575000047683716, 
                        "Height": 0.24770642817020416
                    }, 
                    "FaceId": "ce7ed422-2132-4a11-ab14-06c5c410f29f", 
                    "ExternalImageId": "example-image.jpg", 
                    "Confidence": 99.993408203125, 
                    "ImageId": "8d67061e-90d2-598f-9fbd-29c8497039c0"
                }
            }
        ], 
        "UnindexedFaces": [], 
        "FaceModelVersion": "3.0", 
        "OrientationCorrection": "ROTATE_0"
    }

For more information, see `Adding Faces to a Collection <https://docs.aws.amazon.com/rekognition/latest/dg/add-faces-to-collection-procedure.html>`__ in the *Amazon Rekognition Developer Guide*.
