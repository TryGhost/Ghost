**To list connections on an interconnect**

The following example lists connections that have been provisioned on the given interconnect.

Command::

  aws directconnect describe-hosted-connections --connection-id dxcon-fgktov66

Output::

  {
      "connections": [
          {
              "partnerName": "TIVIT", 
              "vlan": 101, 
              "ownerAccount": "123456789012", 
              "connectionId": "dxcon-ffzc51m1", 
              "connectionState": "ordering", 
              "bandwidth": "500Mbps", 
              "location": "TIVIT", 
              "connectionName": "mydcinterconnect", 
              "region": "sa-east-1"
          }
      ]
  }