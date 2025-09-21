**To compare faces in two images**

The following ``compare-faces`` command compares faces in two images stored in an Amazon S3 bucket. ::

    aws rekognition compare-faces \
        --source-image '{"S3Object":{"Bucket":"MyImageS3Bucket","Name":"source.jpg"}}' \
        --target-image '{"S3Object":{"Bucket":"MyImageS3Bucket","Name":"target.jpg"}}'

Output::

    {
        "UnmatchedFaces": [], 
        "FaceMatches": [
            {
                "Face": {
                    "BoundingBox": {
                        "Width": 0.12368916720151901, 
                        "Top": 0.16007372736930847, 
                        "Left": 0.5901257991790771, 
                        "Height": 0.25140416622161865
                    }, 
                    "Confidence": 100.0, 
                    "Pose": {
                        "Yaw": -3.7351467609405518, 
                        "Roll": -0.10309021919965744, 
                        "Pitch": 0.8637830018997192
                    }, 
                    "Quality": {
                        "Sharpness": 95.51618957519531, 
                        "Brightness": 65.29893493652344
                    }, 
                    "Landmarks": [
                        {
                            "Y": 0.26721030473709106, 
                            "X": 0.6204193830490112, 
                            "Type": "eyeLeft"
                        }, 
                        {
                            "Y": 0.26831310987472534, 
                            "X": 0.6776827573776245, 
                            "Type": "eyeRight"
                        }, 
                        {
                            "Y": 0.3514654338359833, 
                            "X": 0.6241428852081299, 
                            "Type": "mouthLeft"
                        }, 
                        {
                            "Y": 0.35258132219314575, 
                            "X": 0.6713621020317078, 
                            "Type": "mouthRight"
                        }, 
                        {
                            "Y": 0.3140771687030792, 
                            "X": 0.6428444981575012, 
                            "Type": "nose"
                        }
                    ]
                }, 
                "Similarity": 100.0
            }
        ], 
        "SourceImageFace": {
            "BoundingBox": {
                "Width": 0.12368916720151901, 
                "Top": 0.16007372736930847, 
                "Left": 0.5901257991790771, 
                "Height": 0.25140416622161865
            }, 
            "Confidence": 100.0
        }
    }

For more information, see `Comparing Faces in Images <https://docs.aws.amazon.com/rekognition/latest/dg/faces-comparefaces.html>`__ in the *Amazon Rekognition Developer Guide*.
