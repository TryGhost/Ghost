**To update a LAG**

The following example changes the name of the specified LAG.

Command::

  aws directconnect update-lag --lag-id dxlag-ffjhj9lx --lag-name 2ConnLag

Output::

  {
    "awsDevice": "CSVA1-23u8tlpaz8iks", 
    "numberOfConnections": 2, 
    "lagState": "down", 
    "ownerAccount": "123456789012", 
    "lagName": "2ConnLag", 
    "connections": [
        {
            "ownerAccount": "123456789012", 
            "connectionId": "dxcon-fflqyj95", 
            "lagId": "dxlag-ffjhj9lx", 
            "connectionState": "requested", 
            "bandwidth": "1Gbps", 
            "location": "CSVA1", 
            "connectionName": "Requested Connection 2 for Lag dxlag-ffjhj9lx", 
            "region": "us-east-1"
        }, 
        {
            "ownerAccount": "123456789012", 
            "connectionId": "dxcon-ffqr6x5q", 
            "lagId": "dxlag-ffjhj9lx", 
            "connectionState": "requested", 
            "bandwidth": "1Gbps", 
            "location": "CSVA1", 
            "connectionName": "Requested Connection 1 for Lag dxlag-ffjhj9lx", 
            "region": "us-east-1"
        }
    ], 
    "lagId": "dxlag-ffjhj9lx", 
    "minimumLinks": 0, 
    "connectionsBandwidth": "1Gbps", 
    "region": "us-east-1", 
    "location": "CSVA1"
  }
