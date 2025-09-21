**To delete a LAG**

The following example deletes the specified LAG.

Command::

  aws directconnect delete-lag --lag-id dxlag-ffrhowd9

Output::

  {
    "awsDevice": "EqDC2-4h6ce2r1bes6", 
    "numberOfConnections": 0, 
    "lagState": "deleted", 
    "ownerAccount": "123456789012", 
    "lagName": "TestLAG", 
    "connections": [], 
    "lagId": "dxlag-ffrhowd9", 
    "minimumLinks": 0, 
    "connectionsBandwidth": "1Gbps", 
    "region": "us-east-1", 
    "location": "EqDC2"
  }