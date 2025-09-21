**Example 1: To describe your VPN connections**

The following ``describe-vpn-connections`` example describes all of your Site-to-Site VPN connections. ::

    aws ec2 describe-vpn-connections

Output::

    {
        "VpnConnections": [
            {
                "CustomerGatewayConfiguration": "...configuration information...",
                "CustomerGatewayId": "cgw-01234567abcde1234",
                "Category": "VPN",
                "State": "available",
                "Type": "ipsec.1",
                "VpnConnectionId": "vpn-1122334455aabbccd",
                "TransitGatewayId": "tgw-00112233445566aab",
                "Options": {
                    "EnableAcceleration": false,
                    "StaticRoutesOnly": true,
                    "LocalIpv4NetworkCidr": "0.0.0.0/0",
                    "RemoteIpv4NetworkCidr": "0.0.0.0/0",
                    "TunnelInsideIpVersion": "ipv4"
                },
                "Routes": [],
                "Tags": [
                    {
                        "Key": "Name",
                        "Value": "CanadaVPN"
                    }
                ],
                "VgwTelemetry": [
                    {
                        "AcceptedRouteCount": 0,
                        "LastStatusChange": "2020-07-29T10:35:11.000Z",
                        "OutsideIpAddress": "203.0.113.3",
                        "Status": "DOWN",
                        "StatusMessage": ""
                    },
                    {
                        "AcceptedRouteCount": 0,
                        "LastStatusChange": "2020-09-02T09:09:33.000Z",
                        "OutsideIpAddress": "203.0.113.5",
                        "Status": "UP",
                        "StatusMessage": ""
                    }
                ]
            }
        ]
    }

For more information, see `How AWS Site-to-Site VPN works <https://docs.aws.amazon.com/vpn/latest/s2svpn/how_it_works.html>`__ in the *AWS Site-to-Site VPN User Guide*.

**Example 2: To describe your available VPN connections**

The following ``describe-vpn-connections`` example describes your Site-to-Site VPN connections with a state of ``available``. ::

    aws ec2 describe-vpn-connections \
        --filters "Name=state,Values=available"

For more information, see `How AWS Site-to-Site VPN works <https://docs.aws.amazon.com/vpn/latest/s2svpn/how_it_works.html>`__ in the *AWS Site-to-Site VPN User Guide*.
