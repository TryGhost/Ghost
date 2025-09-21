**To retrieve the permissions policy for a Lambda layer version**

The following ``get-layer-version-policy`` example displays policy information about version 1 for the layer named ``my-layer``. ::

    aws lambda get-layer-version-policy \
        --layer-name my-layer \
        --version-number 1

Output::

    {
        "Policy": {
            "Version":"2012-10-17",
            "Id":"default",
            "Statement":
            [
                {
                    "Sid":"xaccount",
                    "Effect":"Allow",
                    "Principal": {"AWS":"arn:aws:iam::123456789012:root"},
                    "Action":"lambda:GetLayerVersion",
                    "Resource":"arn:aws:lambda:us-west-2:123456789012:layer:my-layer:1"
                }
            ]
        },
        "RevisionId": "c68f21d2-cbf0-4026-90f6-1375ee465cd0"
    }

For more information, see `AWS Lambda Layers <https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html>`__ in the *AWS Lambda Developer Guide*.
