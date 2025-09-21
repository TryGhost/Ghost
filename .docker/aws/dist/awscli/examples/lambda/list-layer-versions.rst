**To list the versions of an AWS Lambda layer**

The following ``list-layers-versions`` example displays information about the versions for the layer named ``my-layer``. ::

    aws lambda list-layer-versions \
        --layer-name my-layer

Output::

    {
        "Layers": [
            {
                "LayerVersionArn": "arn:aws:lambda:us-east-2:123456789012:layer:my-layer:2",
                "Version": 2,
                "Description": "My layer",
                "CreatedDate": "2023-11-15T00:37:46.592+0000",
                "CompatibleRuntimes": [
                    "python3.10",
                    "python3.11"
                ]
            }
        ]
    }

For more information, see `AWS Lambda Layers <https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html>`__ in the *AWS Lambda Developer Guide*.