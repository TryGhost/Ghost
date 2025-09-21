**To delete an API mapping**

The following ``delete-api-mapping`` example deletes an API mapping for the ``api.example.com`` custom domain name. ::

    aws apigatewayv2 delete-api-mapping \
        --api-mapping-id a1b2c3 \
        --domain-name api.example.com

This command produces no output.

For more information, see `Setting up a regional custom domain name in API Gateway <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-regional-api-custom-domain-create.html>`__ in the *Amazon API Gateway Developer Guide*.
