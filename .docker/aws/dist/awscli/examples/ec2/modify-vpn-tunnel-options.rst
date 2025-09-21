**To modify the tunnel options for a VPN connection**

The following ``modify-vpn-tunnel-options`` example updates the Diffie-Hellman groups that are permitted for the specified tunnel and VPN connection. ::

    aws ec2 modify-vpn-tunnel-options \
        --vpn-connection-id vpn-12345678901234567 \
        --vpn-tunnel-outside-ip-address 203.0.113.17 \
        --tunnel-options Phase1DHGroupNumbers=[{Value=14},{Value=15},{Value=16},{Value=17},{Value=18}],Phase2DHGroupNumbers=[{Value=14},{Value=15},{Value=16},{Value=17},{Value=18}]

Output::

    {
        "VpnConnection": {
            "CustomerGatewayConfiguration": "...configuration information...",
            "CustomerGatewayId": "cgw-aabbccddee1122334",
            "Category": "VPN",
            "State": "available",
            "Type": "ipsec.1",
            "VpnConnectionId": "vpn-12345678901234567",
            "VpnGatewayId": "vgw-11223344556677889",
            "Options": {
                "StaticRoutesOnly": false,
                "TunnelOptions": [
                    {
                        "OutsideIpAddress": "203.0.113.17",
                        "Phase1DHGroupNumbers": [
                            {
                                "Value": 14
                            },
                            {
                                "Value": 15
                            },
                            {
                                "Value": 16
                            },
                            {
                                "Value": 17
                            },
                            {
                                "Value": 18
                            }
                        ],
                        "Phase2DHGroupNumbers": [
                            {
                                "Value": 14
                            },
                            {
                                "Value": 15
                            },
                            {
                                "Value": 16
                            },
                            {
                                "Value": 17
                            },
                            {
                                "Value": 18
                            }
                        ]
                    },
                    {
                        "OutsideIpAddress": "203.0.114.19"
                    }
                ]
            },
            "VgwTelemetry": [
                {
                    "AcceptedRouteCount": 0,
                    "LastStatusChange": "2019-09-10T21:56:54.000Z",
                    "OutsideIpAddress": "203.0.113.17",
                    "Status": "DOWN",
                    "StatusMessage": "IPSEC IS DOWN"
                },
                {
                    "AcceptedRouteCount": 0,
                    "LastStatusChange": "2019-09-10T21:56:43.000Z",
                    "OutsideIpAddress": "203.0.114.19",
                    "Status": "DOWN",
                    "StatusMessage": "IPSEC IS DOWN"
                }
            ]
        }
    }
