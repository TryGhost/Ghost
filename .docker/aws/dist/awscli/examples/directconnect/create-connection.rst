**To create a connection from your network to an AWS Direct Connect location**

The following ``create-connection`` command creates a connection from your network to an AWS Direct Connect location::

  aws directconnect create-connection --location TIVIT --bandwidth 1Gbps --connection-name "Connection to AWS"

Output::

  {
      "ownerAccount": "123456789012", 
      "connectionId": "dxcon-fg31dyv6", 
      "connectionState": "requested", 
      "bandwidth": "1Gbps", 
      "location": "TIVIT", 
      "connectionName": "Connection to AWS", 
      "region": "sa-east-1"
  }