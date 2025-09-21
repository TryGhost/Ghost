**To get the method response resource configuration for a HTTP method defined under a REST API's resource**

Command::

  aws apigateway get-method-response --rest-api-id 1234123412 --resource-id y9h6rt --http-method GET --status-code 200

Output::

  {
      "responseModels": {
          "application/json": "Empty"
      }, 
      "statusCode": "200"
  }

