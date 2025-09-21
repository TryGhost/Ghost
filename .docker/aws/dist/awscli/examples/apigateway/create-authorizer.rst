**Example 1: To create a token-based API Gateway Custom Authorizer for the API**

The following ``create-authorizer`` example creates a token-based authorizer. ::

    aws apigateway create-authorizer \
        --rest-api-id 1234123412 \
        --name 'First_Token_Custom_Authorizer' \
        --type TOKEN \
        --authorizer-uri 'arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:123412341234:function:customAuthFunction/invocations' \
        --identity-source 'method.request.header.Authorization' \
        --authorizer-result-ttl-in-seconds 300

Output::

  {
      "authType": "custom", 
      "name": "First_Token_Custom_Authorizer", 
      "authorizerUri": "arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:123412341234:function:customAuthFunction/invocations", 
      "authorizerResultTtlInSeconds": 300, 
      "identitySource": "method.request.header.Authorization", 
      "type": "TOKEN", 
      "id": "z40xj0"
  }

**Example 2: To create a Cognito User Pools based API Gateway Custom Authorizer for the API**

The following ``create-authorizer`` example creates a Cognito User Pools based API Gateway Custom Authorizer. ::

    aws apigateway create-authorizer \
        --rest-api-id 1234123412 \
        --name 'First_Cognito_Custom_Authorizer' \
        --type COGNITO_USER_POOLS \
        --provider-arns 'arn:aws:cognito-idp:us-east-1:123412341234:userpool/us-east-1_aWcZeQbuD' \
        --identity-source 'method.request.header.Authorization'

Output::

  {
      "authType": "cognito_user_pools", 
      "identitySource": "method.request.header.Authorization", 
      "name": "First_Cognito_Custom_Authorizer", 
      "providerARNs": [
          "arn:aws:cognito-idp:us-east-1:342398297714:userpool/us-east-1_qWbZzQhzE"
      ], 
      "type": "COGNITO_USER_POOLS", 
      "id": "5yid1t"
  }

**Example 3: To create a request-based API Gateway Custom Authorizer for the API**

The following ``create-authorizer`` example creates a request-based authorizer. ::

    aws apigateway create-authorizer \
        --rest-api-id 1234123412 \
        --name 'First_Request_Custom_Authorizer' \
        --type REQUEST \
        --authorizer-uri 'arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:123412341234:function:customAuthFunction/invocations' \
        --identity-source 'method.request.header.Authorization,context.accountId' \
        --authorizer-result-ttl-in-seconds 300

Output::

    {
        "id": "z40xj0",
        "name": "First_Request_Custom_Authorizer",
        "type": "REQUEST",
        "authType": "custom",
        "authorizerUri": "arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:123412341234:function:customAuthFunction/invocations",
        "identitySource": "method.request.header.Authorization,context.accountId",
        "authorizerResultTtlInSeconds": 300
    }