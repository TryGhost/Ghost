**To reimport an HTTP API**

The following ``reimport-api`` example updates an existing HTTP API to use the OpenAPI 3.0 definition specified in ``api-definition.yaml``. ::

    aws apigatewayv2 reimport-api \
        --body file://api-definition.yaml \
        --api-id a1b2c3d4

Contents of ``api-definition.yaml``::

    openapi: 3.0.1
    info:
        title: My Lambda API
        version: v1.0
    paths:
        /hello:
            x-amazon-apigateway-any-method:
                x-amazon-apigateway-integration:
                    payloadFormatVersion: 2.0
                    type: aws_proxy
                    httpMethod: POST
                    uri: arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:12356789012:function:hello/invocations
                    connectionType: INTERNET

Output::

    {
        "ApiEndpoint": "https://a1b2c3d4.execute-api.us-west-2.amazonaws.com",
        "ApiId": "a1b2c3d4",
        "ApiKeySelectionExpression": "$request.header.x-api-key",
        "CreatedDate": "2020-04-08T17:19:38+00:00",
        "Name": "My Lambda API",
        "ProtocolType": "HTTP",
        "RouteSelectionExpression": "$request.method $request.path",
        "Tags": {},
        "Version": "v1.0"
    }

For more information, see `Working with OpenAPI definitions for HTTP APIs <https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-open-api.html>`__ in the *Amazon API Gateway Developer Guide*.
