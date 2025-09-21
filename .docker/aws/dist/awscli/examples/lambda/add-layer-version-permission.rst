**To add permissions to a layer version**

The following ``add-layer-version-permission`` example grants permission for the specified account to use version 1 of the layer ``my-layer``. ::

    aws lambda add-layer-version-permission \
        --layer-name my-layer \
        --statement-id xaccount \
        --action lambda:GetLayerVersion  \
        --principal 123456789012 \
        --version-number 1

Output::

    {
        "RevisionId": "35d87451-f796-4a3f-a618-95a3671b0a0c",
        "Statement":
        {
            "Sid":"xaccount",
            "Effect":"Allow",
            "Principal":{
                "AWS":"arn:aws:iam::210987654321:root"
            },
            "Action":"lambda:GetLayerVersion",
            "Resource":"arn:aws:lambda:us-east-2:123456789012:layer:my-layer:1"
        }
    }

For more information, see `AWS Lambda Layers <https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html>`__ in the *AWS Lambda Developer Guide*.
