**To tag a resource**

The following ``tag-resource`` example adds a tag with the key name ``Department`` and a value of ``Accounting`` to the specified API. ::

    aws apigatewayv2 tag-resource \
        --resource-arn arn:aws:apigateway:us-west-2::/apis/a1b2c3d4 \
        --tags Department=Accounting

This command produces no output.

For more information, see `Tagging your API Gateway resources <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-tagging.html>`__ in the *Amazon API Gateway Developer Guide*.
