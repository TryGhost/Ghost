**To analyze text in a document**

The following ``analyze-document`` example shows how to analyze text in a document. 

Linux/macOS::

    aws textract analyze-document \
        --document '{"S3Object":{"Bucket":"bucket","Name":"document"}}' \
        --feature-types '["TABLES","FORMS"]'

Windows::

    aws textract analyze-document \
        --document "{\"S3Object\":{\"Bucket\":\"bucket\",\"Name\":\"document\"}}" \
        --feature-types "[\"TABLES\",\"FORMS\"]" \
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
                            "87586964-d50d-43e2-ace5-8a890657b9a0", 
                            "a1e72126-21d9-44f4-a8d6-5c385f9002ba", 
                            "e889d012-8a6b-4d2e-b7cd-7a8b327d876a"
                        ]
                    }
                ], 
                "BlockType": "PAGE", 
                "Id": "c2227f12-b25d-4e1f-baea-1ee180d926b2"
            }
        ], 
        "DocumentMetadata": {
            "Pages": 1
        }
    }

For more information, see `Analyzing Document Text with Amazon Textract`_ in the *Amazon Textract Developers Guide*

.. _`Analyzing Document Text with Amazon Textract`: https://docs.aws.amazon.com/textract/latest/dg/analyzing-document-text.html