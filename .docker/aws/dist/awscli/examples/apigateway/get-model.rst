**To get the configuration for a model defined under a REST API**

Command::

  aws apigateway get-model --rest-api-id 1234123412 --model-name Empty

Output::

  {
      "contentType": "application/json", 
      "description": "This is a default empty schema model", 
      "name": "Empty", 
      "id": "etd5w5", 
      "schema": "{\n  \"$schema\": \"http://json-schema.org/draft-04/schema#\",\n  \"title\" : \"Empty Schema\",\n  \"type\" : \"object\"\n}"
  }

