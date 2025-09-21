**To create a hosted connection on an interconnect**

The following ``allocate-hosted-connection`` example creates a hosted connection on the specified interconnect. ::

    aws directconnect allocate-hosted-connection \
        --bandwidth 500Mbps \
        --connection-name mydcinterconnect \
        --owner-account 123456789012 
        -connection-id dxcon-fgktov66 
        -vlan 101

Output::

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
