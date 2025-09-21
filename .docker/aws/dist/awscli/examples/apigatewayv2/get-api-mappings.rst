**To get API mappings for a custom domain name**

The following ``get-api-mappings`` example displays a list of all of the API mappings for the ``api.example.com`` custom domain name. ::

    aws apigatewayv2 get-api-mappings \
        --domain-name api.example.com

Output::

    {
        "Items": [
            {
                "ApiId": "a1b2c3d4",
                "ApiMappingId": "a1b2c3d5",
                "ApiMappingKey": "myTestApi"
                "Stage": "test"
            },
            {
                "ApiId": "a5b6c7d8",
                "ApiMappingId": "a1b2c3d6",
                "ApiMappingKey": "myDevApi"
                "Stage": "dev"
            },
        ]
    }

For more information, see `Setting up a regional custom domain name in API Gateway <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-regional-api-custom-domain-create.html>`__ in the *Amazon API Gateway Developer Guide*.
