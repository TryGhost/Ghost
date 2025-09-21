**To remove tags from a resource**

The following ``untag-resource`` example removes tags with the key names ``Project`` and ``Owner`` from the specified API. ::

    aws apigatewayv2 untag-resource \
        --resource-arn arn:aws:apigateway:us-west-2::/apis/a1b2c3d4 \
        --tag-keys Project Owner

This command produces no output.

For more information, see `Tagging your API Gateway resources <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-tagging.html>`__ in the *Amazon API Gateway Developer Guide*.
