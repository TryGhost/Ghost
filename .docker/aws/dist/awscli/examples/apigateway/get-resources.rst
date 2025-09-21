**To get a list of resources for a REST API**

Command::

  aws apigateway get-resources --rest-api-id 1234123412

Output::

  {
      "items": [
          {
              "path": "/resource/subresource", 
              "resourceMethods": {
                  "POST": {}
              }, 
              "id": "024ace", 
              "pathPart": "subresource", 
              "parentId": "ai5b02"
          }
      ]
  }
