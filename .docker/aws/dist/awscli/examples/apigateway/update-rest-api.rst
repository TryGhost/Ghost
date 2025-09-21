**To change the name of an API**

Command::

  aws apigateway update-rest-api --rest-api-id 1234123412 --patch-operations op=replace,path=/name,value='New Name'

**To change the description of an API**

Command::

  aws apigateway update-rest-api --rest-api-id 1234123412 --patch-operations op=replace,path=/description,value='New Description'
