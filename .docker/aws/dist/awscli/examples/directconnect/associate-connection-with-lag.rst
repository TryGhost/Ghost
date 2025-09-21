**To associate a connection with a LAG**

The following example associates the specified connection with the specified LAG.

Command::

  aws directconnect associate-connection-with-lag --lag-id dxlag-fhccu14t --connection-id dxcon-fg9607vm

Output::

  {
    "ownerAccount": "123456789012", 
    "connectionId": "dxcon-fg9607vm", 
    "lagId": "dxlag-fhccu14t", 
    "connectionState": "requested", 
    "bandwidth": "1Gbps", 
    "location": "EqDC2", 
    "connectionName": "Con2ForLag", 
    "region": "us-east-1"
  }