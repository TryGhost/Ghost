**To detect text in a document**

The following ``detect-document-text`` The following example shows how to detect text in a document. 

Linux/macOS::

    aws textract detect-document-text \
        --document '{"S3Object":{"Bucket":"bucket","Name":"document"}}'

Windows::

    aws textract detect-document-text \
        --document "{\"S3Object\":{\"Bucket\":\"bucket\",\"Name\":\"document\"}}" \
        --region region-name

Output::

    {
        "Blocks": [
            {
                "Geometry": {
                    "BoundingBox": {
                        "Width": 1.0, 
                        "Top": 0.0, 
                        "Left": 0.0, 
                        "Height": 1.0
                    }, 
                    "Polygon": [
                        {
                            "Y": 0.0, 
                            "X": 0.0
                        }, 
                        {
                            "Y": 0.0, 
                            "X": 1.0
                        }, 
                        {
                            "Y": 1.0, 
                            "X": 1.0
                        }, 
                        {
                            "Y": 1.0, 
                            "X": 0.0
                        }
                    ]
                }, 
                "Relationships": [
                    {
                        "Type": "CHILD", 
                        "Ids": [
                            "896a9f10-9e70-4412-81ce-49ead73ed881", 
                            "0da18623-dc4c-463d-a3d1-9ac050e9e720", 
                            "167338d7-d38c-4760-91f1-79a8ec457bb2"
                        ]
                    } 
                ], 
                "BlockType": "PAGE", 
                "Id": "21f0535e-60d5-4bc7-adf2-c05dd851fa25"
            }, 
            {
                "Relationships": [
                    {
                        "Type": "CHILD", 
                        "Ids": [
                            "62490c26-37ea-49fa-8034-7a9ff9369c9c", 
                            "1e4f3f21-05bd-4da9-ba10-15d01e66604c"
                        ]
                    }
                ], 
                "Confidence": 89.11581420898438, 
                "Geometry": {
                    "BoundingBox": {
                        "Width": 0.33642634749412537, 
                        "Top": 0.17169663310050964, 
                        "Left": 0.13885067403316498, 
                        "Height": 0.49159330129623413
                    }, 
                    "Polygon": [
                        {
                            "Y": 0.17169663310050964, 
                            "X": 0.13885067403316498
                        }, 
                        {
                            "Y": 0.17169663310050964, 
                            "X": 0.47527703642845154
                        }, 
                        {
                            "Y": 0.6632899641990662, 
                            "X": 0.47527703642845154
                        }, 
                        {
                            "Y": 0.6632899641990662, 
                            "X": 0.13885067403316498
                        }
                    ]
                }, 
                "Text": "He llo,", 
                "BlockType": "LINE", 
                "Id": "896a9f10-9e70-4412-81ce-49ead73ed881"
            }, 
            {
                "Relationships": [
                    {
                        "Type": "CHILD", 
                        "Ids": [
                            "19b28058-9516-4352-b929-64d7cef29daf"
                        ]
                    }
                ], 
                "Confidence": 85.5694351196289, 
                "Geometry": {
                    "BoundingBox": {
                        "Width": 0.33182239532470703, 
                        "Top": 0.23131252825260162, 
                        "Left": 0.5091826915740967, 
                        "Height": 0.3766750991344452
                    }, 
                    "Polygon": [
                        {
                            "Y": 0.23131252825260162, 
                            "X": 0.5091826915740967
                        }, 
                        {
                            "Y": 0.23131252825260162, 
                            "X": 0.8410050868988037
                        }, 
                        {
                            "Y": 0.607987642288208, 
                            "X": 0.8410050868988037
                        }, 
                        {
                            "Y": 0.607987642288208, 
                            "X": 0.5091826915740967
                        }
                    ]
                }, 
                "Text": "worlc", 
                "BlockType": "LINE", 
                "Id": "0da18623-dc4c-463d-a3d1-9ac050e9e720"
            }
        ], 
        "DocumentMetadata": {
            "Pages": 1
        }
    }

For more information, see `Detecting Document Text with Amazon Textract`_ in the *Amazon Textract Developers Guide*

.. _`Detecting Document Text with Amazon Textract`: https://docs.aws.amazon.com/textract/latest/dg/detecting-document-text.html