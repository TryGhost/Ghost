**To create a method for a resource in an API with no authorization, no API key, and a custom method request header**

Command::

  aws apigateway put-method --rest-api-id 1234123412 --resource-id a1b2c3 --http-method PUT --authorization-type "NONE" --no-api-key-required --request-parameters "method.request.header.custom-header=false"
