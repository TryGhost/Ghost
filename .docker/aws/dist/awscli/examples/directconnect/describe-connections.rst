**To list all connections in the current region**

The following ``describe-connections`` command lists all connections in the current region::

  aws directconnect describe-connections

Output::

  {
    "connections": [
        {
            "awsDevice": "EqDC2-123h49s71dabc", 
            "ownerAccount": "123456789012", 
            "connectionId": "dxcon-fguhmqlc", 
            "lagId": "dxlag-ffrz71kw", 
            "connectionState": "down", 
            "bandwidth": "1Gbps", 
            "location": "EqDC2", 
            "connectionName": "My_Connection", 
            "loaIssueTime": 1491568964.0, 
            "region": "us-east-1"
        }
    ]
  }
