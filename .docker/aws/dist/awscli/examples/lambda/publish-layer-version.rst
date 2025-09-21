**To create a Lambda layer version**

The following ``publish-layer-version`` example creates a new Python library layer version. The command retrieves the layer content a file named ``layer.zip`` in the specified S3 bucket. ::

    aws lambda publish-layer-version \
        --layer-name my-layer \
        --description "My Python layer" \
        --license-info "MIT" \
        --content S3Bucket=lambda-layers-us-west-2-123456789012,S3Key=layer.zip \
        --compatible-runtimes python3.10 python3.11

Output::

    {
        "Content": {
            "Location": "https://awslambda-us-west-2-layers.s3.us-west-2.amazonaws.com/snapshots/123456789012/my-layer-4aaa2fbb-ff77-4b0a-ad92-5b78a716a96a?versionId=27iWyA73cCAYqyH...",
            "CodeSha256": "tv9jJO+rPbXUUXuRKi7CwHzKtLDkDRJLB3cC3Z/ouXo=",
            "CodeSize": 169
        },
        "LayerArn": "arn:aws:lambda:us-west-2:123456789012:layer:my-layer",
        "LayerVersionArn": "arn:aws:lambda:us-west-2:123456789012:layer:my-layer:1",
        "Description": "My Python layer",
        "CreatedDate": "2023-11-14T23:03:52.894+0000",
        "Version": 1,
        "LicenseInfo": "MIT",
        "CompatibleRuntimes": [
            "python3.10",
            "python3.11"
        ]
    }

For more information, see `AWS Lambda Layers <https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html>`__ in the *AWS Lambda Developer Guide*.