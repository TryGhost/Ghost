**To get the API Gateway per-API Authorizer settings**

Command::

  aws apigateway get-authorizer --rest-api-id 1234123412 --authorizer-id gfi4n3

Output::

  {
      "authorizerResultTtlInSeconds": 300, 
      "name": "MyAuthorizer", 
      "type": "TOKEN", 
      "identitySource": "method.request.header.Authorization", 
      "authorizerUri": "arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:123412341234:function:authorizer_function/invocations", 
      "id": "gfi4n3"
  }
