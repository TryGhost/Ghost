**To list the layers that are compatible with your function's runtime**

The following ``list-layers`` example displays information about layers that are compatible with the Python 3.11 runtime. ::

    aws lambda list-layers \
        --compatible-runtime python3.11

Output::

    {
        "Layers": [
            {
                "LayerName": "my-layer",
                "LayerArn": "arn:aws:lambda:us-east-2:123456789012:layer:my-layer",
                "LatestMatchingVersion": {
                    "LayerVersionArn": "arn:aws:lambda:us-east-2:123456789012:layer:my-layer:2",
                    "Version": 2,
                    "Description": "My layer",
                    "CreatedDate": "2023-11-15T00:37:46.592+0000",
                    "CompatibleRuntimes": [
                        "python3.10",
                        "python3.11"
                    ]
                }
            }
        ]
    }

For more information, see `AWS Lambda Layers <https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html>`__ in the *AWS Lambda Developer Guide*.