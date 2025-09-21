**To describe your LAGs**

The following command describes all of your LAGs for the current region.

Command::

  aws directconnect describe-lags

Output::

  {
    "lags": [
        {
            "awsDevice": "EqDC2-19y7z3m17xpuz", 
            "numberOfConnections": 2, 
            "lagState": "down", 
            "ownerAccount": "123456789012", 
            "lagName": "DA-LAG", 
            "connections": [
                {
                    "ownerAccount": "123456789012", 
                    "connectionId": "dxcon-ffnikghc", 
                    "lagId": "dxlag-fgsu9erb", 
                    "connectionState": "requested", 
                    "bandwidth": "10Gbps", 
                    "location": "EqDC2", 
                    "connectionName": "Requested Connection 1 for Lag dxlag-fgsu9erb", 
                    "region": "us-east-1"
                }, 
                {
                    "ownerAccount": "123456789012", 
                    "connectionId": "dxcon-fglgbdea", 
                    "lagId": "dxlag-fgsu9erb", 
                    "connectionState": "requested", 
                    "bandwidth": "10Gbps", 
                    "location": "EqDC2", 
                    "connectionName": "Requested Connection 2 for Lag dxlag-fgsu9erb", 
                    "region": "us-east-1"
                }
            ], 
            "lagId": "dxlag-fgsu9erb", 
            "minimumLinks": 0, 
            "connectionsBandwidth": "10Gbps", 
            "region": "us-east-1", 
            "location": "EqDC2"
        }
    ]
  }