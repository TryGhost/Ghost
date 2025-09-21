**To modify a VPN connection**

The following ``modify-vpn-connection`` example changes the target gateway for VPN connection ``vpn-12345678901234567`` to virtual private gateway ``vgw-11223344556677889``::

    aws ec2 modify-vpn-connection \
        --vpn-connection-id vpn-12345678901234567 \
        --vpn-gateway-id vgw-11223344556677889

Output::

    {
        "VpnConnection": {
            "CustomerGatewayConfiguration": "...configuration information...",
            "CustomerGatewayId": "cgw-aabbccddee1122334",
            "Category": "VPN",
            "State": "modifying",
            "Type": "ipsec.1",
            "VpnConnectionId": "vpn-12345678901234567",
            "VpnGatewayId": "vgw-11223344556677889",
            "Options": {
                "StaticRoutesOnly": false
            },
            "VgwTelemetry": [
                {
                    "AcceptedRouteCount": 0,
                    "LastStatusChange": "2019-07-17T07:34:00.000Z",
                    "OutsideIpAddress": "18.210.3.222",
                    "Status": "DOWN",
                    "StatusMessage": "IPSEC IS DOWN"
                },
                {
                    "AcceptedRouteCount": 0,
                    "LastStatusChange": "2019-07-20T21:20:16.000Z",
                    "OutsideIpAddress": "34.193.129.33",
                    "Status": "DOWN",
                    "StatusMessage": "IPSEC IS DOWN"
                }
            ]
        }
    }
