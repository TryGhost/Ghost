**To get the results of asynchronous text detection in a multi-page document**

The following ``get-document-text-detection`` example shows how to get the results of asynchronous text detection in a multi-page document. ::

    aws textract get-document-text-detection \
        --job-id 57849a3dc627d4df74123dca269d69f7b89329c870c65bb16c9fd63409d200b9 \
        --max-results 1000

Output ::

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
                            "1b926a34-0357-407b-ac8f-ec473160c6a9", 
                            "0c35dc17-3605-4c9d-af1a-d9451059df51", 
                            "dea3db8a-52c2-41c0-b50c-81f66f4aa758"
                        ]
                    }
                ], 
                "BlockType": "PAGE", 
                "Id": "84671a5e-8c99-43be-a9d1-6838965da33e", 
                "Page": 1
            }
        ], 
        "NextToken": "GcqyoAJuZwujOT35EN4LCI3EUzMtiLq3nKyFFHvU5q1SaIdEBcSty+njNgoWwuMP/muqc96S4o5NzDqehhXvhkodMyVO5OJGyms5lsrCxibWJw==", 
        "DocumentMetadata": {
            "Pages": 1
        }, 
        "JobStatus": "SUCCEEDED"
    }

For more information, see `Detecting and Analyzing Text in Multi-Page Documents`_ in the *Amazon Textract Developers Guide*

.. _`Detecting and Analyzing Text in Multi-Page Documents`: https://docs.aws.amazon.com/textract/latest/dg/async.html