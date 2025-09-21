**To update the connectivity information for a Greengrass core**

The following ``update-connectivity-info`` example changes the endpoints that devices can use to connect to the specified Greengrass core. Connectivity information is a list of IP addresses or domain names, with corresponding port numbers and optional customer-defined metadata. You might need to update connectivity information when the local network changes. ::

    aws greengrass update-connectivity-info \
        --thing-name "MyGroup_Core" \
        --connectivity-info "[{\"Metadata\":\"\",\"PortNumber\":8883,\"HostAddress\":\"127.0.0.1\",\"Id\":\"localhost_127.0.0.1_0\"},{\"Metadata\":\"\",\"PortNumber\":8883,\"HostAddress\":\"192.168.1.3\",\"Id\":\"localIP_192.168.1.3\"}]"

Output::

    {
        "Version": "312de337-59af-4cf9-a278-2a23bd39c300"
    }
