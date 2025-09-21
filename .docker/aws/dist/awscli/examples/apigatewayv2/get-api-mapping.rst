**To get information about an API mapping for a custom domain name**

The following ``get-api-mapping`` example displays infomation about an API mapping for the ``api.example.com`` custom domain name. ::

    aws apigatewayv2 get-api-mapping \
        --api-mapping-id a1b2c3 \
        --domain-name api.example.com

Output::

    {
        "ApiId": "a1b2c3d4",
        "ApiMappingId": "a1b2c3d5",
        "ApiMappingKey": "myTestApi"
        "Stage": "test"
    }

For more information, see `Setting up a regional custom domain name in API Gateway <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-regional-api-custom-domain-create.html>`__ in the *Amazon API Gateway Developer Guide*.
