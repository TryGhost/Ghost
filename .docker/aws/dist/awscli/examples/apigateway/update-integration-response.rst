**To change an integration response header to have a static mapping of '*'**

Command::

  aws apigateway update-integration-response --rest-api-id 1234123412 --resource-id 3gapai --http-method GET --status-code 200 --patch-operations op='replace',path='/responseParameters/method.response.header.Access-Control-Allow-Origin',value='"'"'*'"'"'

Output::

  {
      "statusCode": "200", 
      "responseParameters": {
          "method.response.header.Access-Control-Allow-Origin": "'*'"
      }
  }

**To remove an integration response header**

Command::

  aws apigateway update-integration-response --rest-api-id 1234123412 --resource-id 3gapai --http-method GET --status-code 200 --patch-operations op='remove',path='/responseParameters/method.response.header.Access-Control-Allow-Origin'

