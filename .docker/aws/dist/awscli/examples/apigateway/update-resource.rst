**To move a resource and place it under a different parent resource in an API**

Command::

  aws apigateway update-resource --rest-api-id 1234123412 --resource-id 1a2b3c --patch-operations op=replace,path=/parentId,value='3c2b1a'

Output::

  {
      "path": "/resource", 
      "pathPart": "resource", 
      "id": "1a2b3c", 
      "parentId": "3c2b1a"
  }

**To rename a resource (pathPart) in an API**

Command::

  aws apigateway update-resource --rest-api-id 1234123412 --resource-id 1a2b3c --patch-operations op=replace,path=/pathPart,value=newresourcename

Output::

  {
      "path": "/newresourcename", 
      "pathPart": "newresourcename", 
      "id": "1a2b3c", 
      "parentId": "3c2b1a"
  }
