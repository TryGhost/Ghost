**To get the method resource configuration for a HTTP method defined under a REST API's resource**

Command::

  aws apigateway get-method --rest-api-id 1234123412 --resource-id y9h6rt --http-method GET

Output::

  {
      "apiKeyRequired": false, 
      "httpMethod": "GET", 
      "methodIntegration": {
          "integrationResponses": {
              "200": {
                  "responseTemplates": {
                      "application/json": null
                  }, 
                  "statusCode": "200"
              }
          }, 
          "cacheKeyParameters": [], 
          "uri": "arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:123412341234:function:My_Function/invocations", 
          "httpMethod": "POST", 
          "cacheNamespace": "y9h6rt", 
          "type": "AWS"
      }, 
      "requestParameters": {}, 
      "methodResponses": {
          "200": {
              "responseModels": {
                  "application/json": "Empty"
              }, 
              "statusCode": "200"
          }
      }, 
      "authorizationType": "NONE"
  }

