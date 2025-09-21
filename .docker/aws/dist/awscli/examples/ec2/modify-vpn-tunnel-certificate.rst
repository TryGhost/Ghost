**To rotate a VPN tunnel certificate**

The following ``modify-vpn-tunnel-certificate`` example rotates the certificate for the specified tunnel for a VPN connection ::

    aws ec2 modify-vpn-tunnel-certificate \
        --vpn-tunnel-outside-ip-address 203.0.113.17 \
        --vpn-connection-id vpn-12345678901234567

Output::

    {
        "VpnConnection": {
            "CustomerGatewayConfiguration": ...configuration information...,
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
                    "LastStatusChange": "2019-09-11T17:27:14.000Z",
                    "OutsideIpAddress": "203.0.113.17",
                    "Status": "DOWN",
                    "StatusMessage": "IPSEC IS DOWN",
                    "CertificateArn": "arn:aws:acm:us-east-1:123456789101:certificate/c544d8ce-20b8-4fff-98b0-example"
                },
                {
                    "AcceptedRouteCount": 0,
                    "LastStatusChange": "2019-09-11T17:26:47.000Z",
                    "OutsideIpAddress": "203.0.114.18",
                    "Status": "DOWN",
                    "StatusMessage": "IPSEC IS DOWN",
                    "CertificateArn": "arn:aws:acm:us-east-1:123456789101:certificate/5ab64566-761b-4ad3-b259-example"
                }
            ]
        }
    }
