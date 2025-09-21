**To change the name of the Custom Authorizer**

Command::

  aws apigateway update-authorizer --rest-api-id 1234123412 --authorizer-id gfi4n3 --patch-operations op='replace',path='/name',value='testAuthorizer'

Output::

  {
      "authType": "custom", 
      "name": "testAuthorizer", 
      "authorizerUri": "arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:123412341234:function:customAuthorizer/invocations",         
      "authorizerResultTtlInSeconds": 300, 
      "identitySource": "method.request.header.Authorization", 
      "type": "TOKEN", 
      "id": "gfi4n3"
  }

**To change the Lambda Function that is invoked by the Custom Authorizer**

Command::

  aws apigateway update-authorizer --rest-api-id 1234123412 --authorizer-id gfi4n3 --patch-operations op='replace',path='/authorizerUri',value='arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:123412341234:function:newAuthorizer/invocations'

Output::

  {
      "authType": "custom", 
      "name": "testAuthorizer", 
      "authorizerUri": "arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:123412341234:function:newAuthorizer/invocations", 
      "authorizerResultTtlInSeconds": 300, 
      "identitySource": "method.request.header.Authorization", 
      "type": "TOKEN", 
      "id": "gfi4n3"
  }
