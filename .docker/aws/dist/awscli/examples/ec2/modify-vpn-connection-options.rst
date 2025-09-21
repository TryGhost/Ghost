**To modify your VPN connection options**

The following ``modify-vpn-connection-options`` example modifies the local IPv4 CIDR on the customer gateway side of the specified VPN connection. ::

    aws ec2 modify-vpn-connection-options \
        --vpn-connection-id vpn-1122334455aabbccd \
        --local-ipv4-network-cidr 10.0.0.0/16

Output::

    {
        "VpnConnections": [
            {
                "CustomerGatewayConfiguration": "...configuration information...",
                "CustomerGatewayId": "cgw-01234567abcde1234",
                "Category": "VPN",
                "State": "modifying",
                "Type": "ipsec.1",
                "VpnConnectionId": "vpn-1122334455aabbccd",
                "TransitGatewayId": "tgw-00112233445566aab",
                "Options": {
                    "EnableAcceleration": false,
                    "StaticRoutesOnly": true,
                    "LocalIpv4NetworkCidr": "10.0.0.0/16",
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

For more information, see `Modifying Site-to-Site VPN connection options <https://docs.aws.amazon.com/vpn/latest/s2svpn/modify-vpn-connection-options.html>`__ in the *AWS Site-to-Site VPN User Guide*.
