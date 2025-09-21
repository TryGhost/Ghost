**To get the results of asynchronous text analysis of a multi-page document**

The following ``get-document-analysis`` example shows how to get the results of asynchronous text analysis of a multi-page document. ::

    aws textract get-document-analysis \
        --job-id df7cf32ebbd2a5de113535fcf4d921926a701b09b4e7d089f3aebadb41e0712b \
        --max-results 1000

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
                            "75966e64-81c2-4540-9649-d66ec341cd8f", 
                            "bb099c24-8282-464c-a179-8a9fa0a057f0", 
                            "5ebf522d-f9e4-4dc7-bfae-a288dc094595"
                        ]
                    }
                ], 
                "BlockType": "PAGE", 
                "Id": "247c28ee-b63d-4aeb-9af0-5f7ea8ba109e", 
                "Page": 1
            }
        ], 
        "NextToken": "cY1W3eTFvoB0cH7YrKVudI4Gb0H8J0xAYLo8xI/JunCIPWCthaKQ+07n/ElyutsSy0+1VOImoTRmP1zw4P0RFtaeV9Bzhnfedpx1YqwB4xaGDA==", 
        "DocumentMetadata": {
            "Pages": 1
        }, 
        "JobStatus": "SUCCEEDED"
    }

For more information, see `Detecting and Analyzing Text in Multi-Page Documents`_ in the *Amazon Textract Developers Guide*

.. _`Detecting and Analyzing Text in Multi-Page Documents`: https://docs.aws.amazon.com/textract/latest/dg/async.html