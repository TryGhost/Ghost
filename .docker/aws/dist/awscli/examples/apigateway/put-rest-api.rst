**To overwrite an existing API using a Swagger template**

Command::

  aws apigateway put-rest-api --rest-api-id 1234123412 --mode overwrite --body 'fileb:///path/to/API_Swagger_template.json'

**To merge a Swagger template into an existing API**

Command::

  aws apigateway put-rest-api --rest-api-id 1234123412 --mode merge --body 'fileb:///path/to/API_Swagger_template.json'
