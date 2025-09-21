**Example 1: To modify a method to require an API key**

The following ``update-method`` example modifies the method to require an API key. ::

    aws apigateway update-method \
        --rest-api-id 1234123412 \
        --resource-id a1b2c3 \
        --http-method GET \
        --patch-operations op="replace",path="/apiKeyRequired",value="true"



Output::

    {
        "httpMethod": "GET",
        "authorizationType": "NONE",
        "apiKeyRequired": true,
        "methodResponses": {
            "200": {
                "statusCode": "200",
                "responseModels": {}
            }
        },
        "methodIntegration": {
            "type": "AWS",
            "httpMethod": "POST",
            "uri": "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:123456789111:function:hello-world/invocations",
            "passthroughBehavior": "WHEN_NO_MATCH",
            "contentHandling": "CONVERT_TO_TEXT",
            "timeoutInMillis": 29000,
            "cacheNamespace": "h7i8j9",
            "cacheKeyParameters": [],
            "integrationResponses": {
                "200": {
                    "statusCode": "200",
                    "responseTemplates": {}
                }
            }
        }
    }

**Example 2: To modify a method to require IAM authorization**

The following ``update-method`` example modifies the method to require IAM authorization. ::

    aws apigateway update-method \
        --rest-api-id 1234123412 \
        --resource-id a1b2c3 \
        --http-method GET \
        --patch-operations op="replace",path="/authorizationType",value="AWS_IAM"

Output::

     {
        "httpMethod": "GET",
        "authorizationType": "AWS_IAM",
        "apiKeyRequired": false,
        "methodResponses": {
            "200": {
                "statusCode": "200",
                "responseModels": {}
            }
        },
        "methodIntegration": {
            "type": "AWS",
            "httpMethod": "POST",
            "uri": "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:123456789111:function:hello-world/invocations",
            "passthroughBehavior": "WHEN_NO_MATCH",
            "contentHandling": "CONVERT_TO_TEXT",
            "timeoutInMillis": 29000,
            "cacheNamespace": "h7i8j9",
            "cacheKeyParameters": [],
            "integrationResponses": {
                "200": {
                    "statusCode": "200",
                    "responseTemplates": {}
                }
            }
        }
    }

**Example 3: To modify a method to require Lambda authorization**

The following ``update-method`` example modifies the method to required Lambda authorization. ::

    aws apigateway update-method --rest-api-id 1234123412 \
        --resource-id a1b2c3 \
        --http-method GET \
        --patch-operations op="replace",path="/authorizationType",value="CUSTOM" op="replace",path="/authorizerId",value="e4f5g6"

Output::

     {
        "httpMethod": "GET",
        "authorizationType": "CUSTOM",
        "authorizerId" : "e4f5g6",
        "apiKeyRequired": false,
        "methodResponses": {
            "200": {
                "statusCode": "200",
                "responseModels": {}
            }
        },
        "methodIntegration": {
            "type": "AWS",
            "httpMethod": "POST",
            "uri": "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:123456789111:function:hello-world/invocations",
            "passthroughBehavior": "WHEN_NO_MATCH",
            "contentHandling": "CONVERT_TO_TEXT",
            "timeoutInMillis": 29000,
            "cacheNamespace": "h7i8j9",
            "cacheKeyParameters": [],
            "integrationResponses": {
                "200": {
                    "statusCode": "200",
                    "responseTemplates": {}
                }
            }
        }
    }

For more information, see `Create, configure, and test usage plans using the API Gateway CLI and REST API <https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-create-usage-plans-with-rest-api.html>`__  and  `Controlling and managing access to a REST API in API Gateway <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-control-access-to-api.html>`__ in the *Amazon API Gateway Developer Guide*.