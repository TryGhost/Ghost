**To delete layer-version permissions**

The following ``remove-layer-version-permission`` example deletes permission for an account to configure a layer version. ::

    aws lambda remove-layer-version-permission \
        --layer-name my-layer \
        --statement-id xaccount \
        --version-number 1

This command produces no output.

For more information, see `AWS Lambda Layers <https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html>`__ in the *AWS Lambda Developer Guide*.
