**To retrieve information about a Lambda layer version**

The following ``get-layer-version`` example displays information for version 1 of the layer named ``my-layer``. ::

    aws lambda get-layer-version \
        --layer-name my-layer \
        --version-number 1

Output::

    {
        "Content": {
            "Location": "https://awslambda-us-east-2-layers.s3.us-east-2.amazonaws.com/snapshots/123456789012/my-layer-4aaa2fbb-ff77-4b0a-ad92-5b78a716a96a?versionId=27iWyA73cCAYqyH...",
            "CodeSha256": "tv9jJO+rPbXUUXuRKi7CwHzKtLDkDRJLB3cC3Z/ouXo=",
            "CodeSize": 169
        },
        "LayerArn": "arn:aws:lambda:us-east-2:123456789012:layer:my-layer",
        "LayerVersionArn": "arn:aws:lambda:us-east-2:123456789012:layer:my-layer:1",
        "Description": "My Python layer",
        "CreatedDate": "2018-11-14T23:03:52.894+0000",
        "Version": 1,
        "LicenseInfo": "MIT",
        "CompatibleRuntimes": [
            "python3.10",
            "python3.11"
        ]
    }

For more information, see `AWS Lambda Layers <https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html>`__ in the *AWS Lambda Developer Guide*.