**Example 1: To create a VPN connection with dynamic routing**

The following ``create-vpn-connection`` example creates a VPN connection between the specified virtual private gateway and the specified customer gateway, and applies tags to the VPN connection. The output includes the configuration information for your customer gateway device, in XML format. ::

    aws ec2 create-vpn-connection \
        --type ipsec.1 \
        --customer-gateway-id cgw-001122334455aabbc \
        --vpn-gateway-id vgw-1a1a1a1a1a1a2b2b2 \
        --tag-specification 'ResourceType=vpn-connection,Tags=[{Key=Name,Value=BGP-VPN}]'

Output::

    {
        "VpnConnection": {
            "CustomerGatewayConfiguration": "...configuration information...",
            "CustomerGatewayId": "cgw-001122334455aabbc",
            "Category": "VPN",
            "State": "pending",
            "VpnConnectionId": "vpn-123123123123abcab",
            "VpnGatewayId": "vgw-1a1a1a1a1a1a2b2b2",
            "Options": {
                "EnableAcceleration": false,
                "StaticRoutesOnly": false,
                "LocalIpv4NetworkCidr": "0.0.0.0/0",
                "RemoteIpv4NetworkCidr": "0.0.0.0/0",
                "TunnelInsideIpVersion": "ipv4",
                "TunnelOptions": [
                    {},
                    {}
                ]
            },
            "Routes": [],
            "Tags": [
                 {
                    "Key": "Name",
                    "Value": "BGP-VPN"
                }
            ]
        }
    }

For more information, see `How AWS Site-to-Site VPN works <https://docs.aws.amazon.com/vpn/latest/s2svpn/how_it_works.html>`__ in the *AWS Site-to-Site VPN User Guide*.

**Example 2: To create a VPN connection with static routing**

The following ``create-vpn-connection`` example creates a VPN connection between the specified virtual private gateway and the specified customer gateway. The options specify static routing. The output includes the configuration information for your customer gateway device, in XML format. ::

    aws ec2 create-vpn-connection \
        --type ipsec.1 \
        --customer-gateway-id cgw-001122334455aabbc \
        --vpn-gateway-id vgw-1a1a1a1a1a1a2b2b2 \
        --options "{\"StaticRoutesOnly\":true}"

Output::

    {
        "VpnConnection": {
            "CustomerGatewayConfiguration": "..configuration information...",
            "CustomerGatewayId": "cgw-001122334455aabbc",
            "Category": "VPN",
            "State": "pending",
            "VpnConnectionId": "vpn-123123123123abcab",
            "VpnGatewayId": "vgw-1a1a1a1a1a1a2b2b2",
            "Options": {
                "EnableAcceleration": false,
                "StaticRoutesOnly": true,
                "LocalIpv4NetworkCidr": "0.0.0.0/0",
                "RemoteIpv4NetworkCidr": "0.0.0.0/0",
                "TunnelInsideIpVersion": "ipv4",
                "TunnelOptions": [
                    {},
                    {}
                ]
            },
            "Routes": [],
            "Tags": []
        }
    }

For more information, see `How AWS Site-to-Site VPN works <https://docs.aws.amazon.com/vpn/latest/s2svpn/how_it_works.html>`__ in the *AWS Site-to-Site VPN User Guide*.

**Example 3: To create a VPN connection and specify your own inside CIDR and pre-shared key**

The following ``create-vpn-connection`` example creates a VPN connection and specifies the inside IP address CIDR block and a custom pre-shared key for each tunnel. The specified values are returned in the ``CustomerGatewayConfiguration`` information. ::

    aws ec2 create-vpn-connection \
        --type ipsec.1 \
        --customer-gateway-id cgw-001122334455aabbc \
        --vpn-gateway-id vgw-1a1a1a1a1a1a2b2b2 \
        --options TunnelOptions='[{TunnelInsideCidr=169.254.12.0/30,PreSharedKey=ExamplePreSharedKey1},{TunnelInsideCidr=169.254.13.0/30,PreSharedKey=ExamplePreSharedKey2}]'

Output::

    {
        "VpnConnection": {
            "CustomerGatewayConfiguration": "..configuration information...",
            "CustomerGatewayId": "cgw-001122334455aabbc",
            "Category": "VPN",
            "State": "pending",
            "VpnConnectionId": "vpn-123123123123abcab",
            "VpnGatewayId": "vgw-1a1a1a1a1a1a2b2b2",
            "Options": {
                "EnableAcceleration": false,
                "StaticRoutesOnly": false,
                "LocalIpv4NetworkCidr": "0.0.0.0/0",
                "RemoteIpv4NetworkCidr": "0.0.0.0/0",
                "TunnelInsideIpVersion": "ipv4",
                "TunnelOptions": [
                    {
                        "OutsideIpAddress": "203.0.113.3",
                        "TunnelInsideCidr": "169.254.12.0/30",
                        "PreSharedKey": "ExamplePreSharedKey1"
                    },
                    {
                        "OutsideIpAddress": "203.0.113.5",
                        "TunnelInsideCidr": "169.254.13.0/30",
                        "PreSharedKey": "ExamplePreSharedKey2"
                    }
                ]
            },
            "Routes": [],
            "Tags": []
        }
    }

For more information, see `How AWS Site-to-Site VPN works <https://docs.aws.amazon.com/vpn/latest/s2svpn/how_it_works.html>`__ in the *AWS Site-to-Site VPN User Guide*.

**Example 4: To create a VPN connection that supports IPv6 traffic**

The following ``create-vpn-connection`` example creates a VPN connection that supports IPv6 traffic between the specified transit gateway and specified customer gateway. The tunnel options for both tunnels specify that AWS must initiate the IKE negotiation. ::

    aws ec2 create-vpn-connection \
        --type ipsec.1 \
        --transit-gateway-id tgw-12312312312312312 \
        --customer-gateway-id cgw-001122334455aabbc \
        --options TunnelInsideIpVersion=ipv6,TunnelOptions=[{StartupAction=start},{StartupAction=start}]

Output::

    {
        "VpnConnection": {
            "CustomerGatewayConfiguration": "..configuration information...",
            "CustomerGatewayId": "cgw-001122334455aabbc",
            "Category": "VPN",
            "State": "pending",
            "VpnConnectionId": "vpn-11111111122222222",
            "TransitGatewayId": "tgw-12312312312312312",
            "Options": {
                "EnableAcceleration": false,
                "StaticRoutesOnly": false,
                "LocalIpv6NetworkCidr": "::/0",
                "RemoteIpv6NetworkCidr": "::/0",
                "TunnelInsideIpVersion": "ipv6",
                "TunnelOptions": [
                    {
                        "OutsideIpAddress": "203.0.113.3",
                        "StartupAction": "start"
                    },
                    {
                        "OutsideIpAddress": "203.0.113.5",
                        "StartupAction": "start"
                    }
                ]
            },
            "Routes": [],
            "Tags": []
        }
    }

For more information, see `How AWS Site-to-Site VPN works <https://docs.aws.amazon.com/vpn/latest/s2svpn/how_it_works.html>`__ in the *AWS Site-to-Site VPN User Guide*.
