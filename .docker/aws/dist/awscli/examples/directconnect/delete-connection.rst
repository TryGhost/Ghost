**To delete a connection**

The following ``delete-connection`` command deletes the specified connection::

  aws directconnect delete-connection --connection-id dxcon-fg31dyv6

Output::

  {
      "ownerAccount": "123456789012", 
      "connectionId": "dxcon-fg31dyv6", 
      "connectionState": "deleted", 
      "bandwidth": "1Gbps", 
      "location": "TIVIT", 
      "connectionName": "Connection to AWS", 
      "region": "sa-east-1"
  }