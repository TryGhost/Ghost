**To get the connectivity information for a Greengrass core**

The following ``get-connectivity-info`` example displays the endpoints that devices can use to connect to the specified Greengrass core. Connectivity information is a list of IP addresses or domain names, with corresponding port numbers and optional customer-defined metadata. ::

    aws greengrass get-connectivity-info \
        --thing-name "MyGroup_Core"

Output::

    {
        "ConnectivityInfo": [
            {
                "Metadata": "",
                "PortNumber": 8883,
                "HostAddress": "127.0.0.1",
                "Id": "AUTOIP_127.0.0.1_0"
            },
            {
                "Metadata": "",
                "PortNumber": 8883,
                "HostAddress": "192.168.1.3",
                "Id": "AUTOIP_192.168.1.3_1"
            },
            {
                "Metadata": "",
                "PortNumber": 8883,
                "HostAddress": "::1",
                "Id": "AUTOIP_::1_2"
            },
            {
                "Metadata": "",
                "PortNumber": 8883,
                "HostAddress": "fe80::1e69:ed93:f5b:f6d",
                "Id": "AUTOIP_fe80::1e69:ed93:f5b:f6d_3"
            }
        ]
    }
