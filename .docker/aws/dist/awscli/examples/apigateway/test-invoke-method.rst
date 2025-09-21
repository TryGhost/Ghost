**To test invoke the root resource in an API by making a GET request**

Command::

  aws apigateway test-invoke-method --rest-api-id 1234123412 --resource-id avl5sg8fw8 --http-method GET --path-with-query-string '/'

**To test invoke a sub-resource in an API by making a GET request with a path parameter value specified**

Command::

  aws apigateway test-invoke-method --rest-api-id 1234123412 --resource-id 3gapai --http-method GET --path-with-query-string '/pets/1'
