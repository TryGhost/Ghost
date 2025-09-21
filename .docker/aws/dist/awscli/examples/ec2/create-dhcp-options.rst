**To create a set of DHCP options**

The following ``create-dhcp-options`` example creates a set of DHCP options that specifies the domain name, the domain name servers, and the NetBIOS node type. ::

    aws ec2 create-dhcp-options \
        --dhcp-configuration \
            "Key=domain-name-servers,Values=10.2.5.1,10.2.5.2" \
            "Key=domain-name,Values=example.com" \
            "Key=netbios-node-type,Values=2"

Output::

    {
        "DhcpOptions": {
            "DhcpConfigurations": [
                {
                    "Key": "domain-name",
                    "Values": [
                        {
                            "Value": "example.com"
                        }
                    ]
                },
                {
                    "Key": "domain-name-servers",
                    "Values": [
                        {
                            "Value": "10.2.5.1"
                        },
                        {
                            "Value": "10.2.5.2"
                        }
                    ]
                },
                {
                    "Key": "netbios-node-type",
                    "Values": [
                        {
                            "Value": "2"
                        }
                    ]
                }
            ],
            "DhcpOptionsId": "dopt-06d52773eff4c55f3"
        }
    }
