**To delete a version of a Lambda layer**

The following ``delete-layer-version`` example deletes version 2 of the layer named ``my-layer``. ::

    aws lambda delete-layer-version \
        --layer-name my-layer \
        --version-number 2

This command produces no output.

For more information, see `AWS Lambda Layers <https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html>`__ in the *AWS Lambda Developer Guide*.
