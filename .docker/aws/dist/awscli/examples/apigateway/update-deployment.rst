**To change the description of a deployment**

Command::

  aws apigateway update-deployment --rest-api-id 1234123412 --deployment-id ztt4m2 --patch-operations op='replace',path='/description',value='newDescription'

Output::

  {
      "description": "newDescription", 
      "id": "ztt4m2", 
      "createdDate": 1455218022
  }

