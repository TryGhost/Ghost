**To create an integration response as the default response with a mapping template defined**

Command::

  aws apigateway put-integration-response --rest-api-id 1234123412 --resource-id a1b2c3 --http-method GET --status-code 200 --selection-pattern "" --response-templates '{"application/json": "{\"json\": \"template\"}"}'

**To create an integration response with a regex of 400 and a statically defined header value**

Command::

  aws apigateway put-integration-response --rest-api-id 1234123412 --resource-id a1b2c3 --http-method GET --status-code 400 --selection-pattern 400 --response-parameters '{"method.response.header.custom-header": "'"'"'custom-value'"'"'"}'
