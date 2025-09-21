**To get the integration configuration for a HTTP method defined under a REST API's resource**

Command::

  aws apigateway get-integration --rest-api-id 1234123412 --resource-id y9h6rt --http-method GET

Output::

  {
      "httpMethod": "POST", 
      "integrationResponses": {
          "200": {
              "responseTemplates": {
                  "application/json": null
              }, 
              "statusCode": "200"
          }
      }, 
      "cacheKeyParameters": [], 
      "type": "AWS", 
      "uri": "arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:123412341234:function:My_Function/invocations", 
      "cacheNamespace": "y9h6rt"
  }

