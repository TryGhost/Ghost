**To change the name for an API Key**

Command::

  aws apigateway update-api-key --api-key sNvjQDMReA1eEQPNAW8r37XsU2rDD7fc7m2SiMnu --patch-operations op='replace',path='/name',value='newName'

Output::

  {
      "description": "currentDescription", 
      "enabled": true, 
      "stageKeys": [
          "41t2j324r5/dev"
      ], 
      "lastUpdatedDate": 1470086052, 
      "createdDate": 1445460347, 
      "id": "sNvjQDMReA1vEQPNzW8r3dXsU2rrD7fcjm2SiMnu", 
      "name": "newName"
  }

**To disable the API Key**

Command::

  aws apigateway update-api-key --api-key sNvjQDMReA1eEQPNAW8r37XsU2rDD7fc7m2SiMnu --patch-operations op='replace',path='/enabled',value='false'

Output::

  {
      "description": "currentDescription", 
      "enabled": false, 
      "stageKeys": [
          "41t2j324r5/dev"
      ], 
      "lastUpdatedDate": 1470086052, 
      "createdDate": 1445460347, 
      "id": "sNvjQDMReA1vEQPNzW8r3dXsU2rrD7fcjm2SiMnu", 
      "name": "newName"
  }
