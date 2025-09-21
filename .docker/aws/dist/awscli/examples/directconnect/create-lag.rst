**To create a LAG with new connections**

The following example creates a LAG and requests two new AWS Direct Connect connections for the LAG with a bandwidth of 1 Gbps.

Command::

  aws directconnect create-lag --location CSVA1 --number-of-connections 2 --connections-bandwidth 1Gbps --lag-name 1GBLag

Output::

  {
    "awsDevice": "CSVA1-23u8tlpaz8iks", 
    "numberOfConnections": 2, 
    "lagState": "pending", 
    "ownerAccount": "123456789012", 
    "lagName": "1GBLag", 
    "connections": [
        {
            "ownerAccount": "123456789012", 
            "connectionId": "dxcon-ffqr6x5q", 
            "lagId": "dxlag-ffjhj9lx", 
            "connectionState": "requested", 
            "bandwidth": "1Gbps", 
            "location": "CSVA1", 
            "connectionName": "Requested Connection 1 for Lag dxlag-ffjhj9lx", 
            "region": "us-east-1"
        }, 
        {
            "ownerAccount": "123456789012", 
            "connectionId": "dxcon-fflqyj95", 
            "lagId": "dxlag-ffjhj9lx", 
            "connectionState": "requested", 
            "bandwidth": "1Gbps", 
            "location": "CSVA1", 
            "connectionName": "Requested Connection 2 for Lag dxlag-ffjhj9lx", 
            "region": "us-east-1"
        }
    ], 
    "lagId": "dxlag-ffjhj9lx", 
    "minimumLinks": 0, 
    "connectionsBandwidth": "1Gbps", 
    "region": "us-east-1", 
    "location": "CSVA1"
  }

**To create a LAG using an existing connection**

The following example creates a LAG from an existing connection in your account, and requests a second new connection for the LAG with the same bandwidth and location as the existing connection. 

Command::

  aws directconnect create-lag --location EqDC2 --number-of-connections 2 --connections-bandwidth 1Gbps --lag-name 2ConnLAG --connection-id dxcon-fgk145dr

Output::

  {
    "awsDevice": "EqDC2-4h6ce2r1bes6", 
    "numberOfConnections": 2, 
    "lagState": "pending", 
    "ownerAccount": "123456789012", 
    "lagName": "2ConnLAG", 
    "connections": [
        {
            "ownerAccount": "123456789012", 
            "connectionId": "dxcon-fh6ljcvo", 
            "lagId": "dxlag-fhccu14t", 
            "connectionState": "requested", 
            "bandwidth": "1Gbps", 
            "location": "EqDC2", 
            "connectionName": "Requested Connection 1 for Lag dxlag-fhccu14t", 
            "region": "us-east-1"
        }, 
        {
            "ownerAccount": "123456789012", 
            "connectionId": "dxcon-fgk145dr", 
            "lagId": "dxlag-fhccu14t", 
            "connectionState": "down", 
            "bandwidth": "1Gbps", 
            "location": "EqDC2", 
            "connectionName": "VAConn1", 
            "region": "us-east-1"
        }
    ], 
    "lagId": "dxlag-fhccu14t", 
    "minimumLinks": 0, 
    "connectionsBandwidth": "1Gbps", 
    "region": "us-east-1", 
    "location": "EqDC2"
  }