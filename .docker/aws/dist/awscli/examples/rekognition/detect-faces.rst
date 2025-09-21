**To detect faces in an image**

The following ``detect-faces`` command detects faces in the specified image stored in an Amazon S3 bucket. ::

    aws rekognition detect-faces \
        --image '{"S3Object":{"Bucket":"MyImageS3Bucket","Name":"MyFriend.jpg"}}' \
        --attributes "ALL" 

Output::

    {
        "FaceDetails": [
            {
                "Confidence": 100.0, 
                "Eyeglasses": {
                    "Confidence": 98.91107940673828, 
                    "Value": false
                }, 
                "Sunglasses": {
                    "Confidence": 99.7966537475586, 
                    "Value": false
                }, 
                "Gender": {
                    "Confidence": 99.56611633300781, 
                    "Value": "Male"
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
                    }, 
                    {
                        "Y": 0.24662546813488007, 
                        "X": 0.6001564860343933, 
                        "Type": "leftEyeBrowLeft"
                    }, 
                    {
                        "Y": 0.24326619505882263, 
                        "X": 0.6303644776344299, 
                        "Type": "leftEyeBrowRight"
                    }, 
                    {
                        "Y": 0.23818562924861908, 
                        "X": 0.6146903038024902, 
                        "Type": "leftEyeBrowUp"
                    }, 
                    {
                        "Y": 0.24373626708984375, 
                        "X": 0.6640064716339111, 
                        "Type": "rightEyeBrowLeft"
                    }, 
                    {
                        "Y": 0.24877218902111053, 
                        "X": 0.7025929093360901, 
                        "Type": "rightEyeBrowRight"
                    }, 
                    {
                        "Y": 0.23938551545143127, 
                        "X": 0.6823262572288513, 
                        "Type": "rightEyeBrowUp"
                    }, 
                    {
                        "Y": 0.265746533870697, 
                        "X": 0.6112898588180542, 
                        "Type": "leftEyeLeft"
                    }, 
                    {
                        "Y": 0.2676128149032593, 
                        "X": 0.6317071914672852, 
                        "Type": "leftEyeRight"
                    }, 
                    {
                        "Y": 0.262735515832901, 
                        "X": 0.6201658248901367, 
                        "Type": "leftEyeUp"
                    }, 
                    {
                        "Y": 0.27025148272514343, 
                        "X": 0.6206279993057251, 
                        "Type": "leftEyeDown"
                    }, 
                    {
                        "Y": 0.268223375082016, 
                        "X": 0.6658390760421753, 
                        "Type": "rightEyeLeft"
                    }, 
                    {
                        "Y": 0.2672517001628876, 
                        "X": 0.687832236289978, 
                        "Type": "rightEyeRight"
                    }, 
                    {
                        "Y": 0.26383838057518005, 
                        "X": 0.6769183874130249, 
                        "Type": "rightEyeUp"
                    }, 
                    {
                        "Y": 0.27138751745224, 
                        "X": 0.676596462726593, 
                        "Type": "rightEyeDown"
                    }, 
                    {
                        "Y": 0.32283174991607666, 
                        "X": 0.6350004076957703, 
                        "Type": "noseLeft"
                    }, 
                    {
                        "Y": 0.3219289481639862, 
                        "X": 0.6567046642303467, 
                        "Type": "noseRight"
                    }, 
                    {
                        "Y": 0.3420318365097046, 
                        "X": 0.6450609564781189, 
                        "Type": "mouthUp"
                    }, 
                    {
                        "Y": 0.3664324879646301, 
                        "X": 0.6455618143081665, 
                        "Type": "mouthDown"
                    }, 
                    {
                        "Y": 0.26721030473709106, 
                        "X": 0.6204193830490112, 
                        "Type": "leftPupil"
                    }, 
                    {
                        "Y": 0.26831310987472534, 
                        "X": 0.6776827573776245, 
                        "Type": "rightPupil"
                    }, 
                    {
                        "Y": 0.26343393325805664, 
                        "X": 0.5946047306060791, 
                        "Type": "upperJawlineLeft"
                    }, 
                    {
                        "Y": 0.3543180525302887, 
                        "X": 0.6044883728027344, 
                        "Type": "midJawlineLeft"
                    }, 
                    {
                        "Y": 0.4084877669811249, 
                        "X": 0.6477024555206299, 
                        "Type": "chinBottom"
                    }, 
                    {
                        "Y": 0.3562754988670349, 
                        "X": 0.707981526851654, 
                        "Type": "midJawlineRight"
                    }, 
                    {
                        "Y": 0.26580461859703064, 
                        "X": 0.7234612107276917, 
                        "Type": "upperJawlineRight"
                    }
                ], 
                "Pose": {
                    "Yaw": -3.7351467609405518, 
                    "Roll": -0.10309021919965744, 
                    "Pitch": 0.8637830018997192
                }, 
                "Emotions": [
                    {
                        "Confidence": 8.74203109741211, 
                        "Type": "SURPRISED"
                    }, 
                    {
                        "Confidence": 2.501944065093994, 
                        "Type": "ANGRY"
                    }, 
                    {
                        "Confidence": 0.7378743290901184, 
                        "Type": "DISGUSTED"
                    }, 
                    {
                        "Confidence": 3.5296201705932617, 
                        "Type": "HAPPY"
                    }, 
                    {
                        "Confidence": 1.7162904739379883, 
                        "Type": "SAD"
                    }, 
                    {
                        "Confidence": 9.518536567687988, 
                        "Type": "CONFUSED"
                    }, 
                    {
                        "Confidence": 0.45474427938461304, 
                        "Type": "FEAR"
                    }, 
                    {
                        "Confidence": 72.79895782470703, 
                        "Type": "CALM"
                    }
                ], 
                "AgeRange": {
                    "High": 48, 
                    "Low": 32
                }, 
                "EyesOpen": {
                    "Confidence": 98.93987274169922, 
                    "Value": true
                }, 
                "BoundingBox": {
                    "Width": 0.12368916720151901, 
                    "Top": 0.16007372736930847, 
                    "Left": 0.5901257991790771, 
                    "Height": 0.25140416622161865
                }, 
                "Smile": {
                    "Confidence": 93.4493179321289, 
                    "Value": false
                }, 
                "MouthOpen": {
                    "Confidence": 90.53053283691406, 
                    "Value": false
                }, 
                "Quality": {
                    "Sharpness": 95.51618957519531, 
                    "Brightness": 65.29893493652344
                }, 
                "Mustache": {
                    "Confidence": 89.85221099853516, 
                    "Value": false
                }, 
                "Beard": {
                    "Confidence": 86.1991195678711, 
                    "Value": true
                }
            }
        ]
    }

For more information, see `Detecting Faces in an Image <https://docs.aws.amazon.com/rekognition/latest/dg/faces-detect-images.html>`__ in the *Amazon Rekognition Developer Guide*.
