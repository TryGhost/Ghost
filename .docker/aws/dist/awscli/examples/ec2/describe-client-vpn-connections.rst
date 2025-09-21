**To describe the connections to a Client VPN endpoint**

The following ``describe-client-vpn-connections`` example displays details about the client connections to the specified Client VPN endpoint. ::

    aws ec2 describe-client-vpn-connections \
        --client-vpn-endpoint-id cvpn-endpoint-123456789123abcde

Output::

    {
        "Connections": [
            {
                "ClientVpnEndpointId": "cvpn-endpoint-123456789123abcde",
                "Timestamp": "2019-08-12 07:58:34",
                "ConnectionId": "cvpn-connection-0e03eb24267165acd",
                "ConnectionEstablishedTime": "2019-08-12 07:57:14",
                "IngressBytes": "32302",
                "EgressBytes": "5696",
                "IngressPackets": "332",
                "EgressPackets": "67",
                "ClientIp": "172.31.0.225",
                "CommonName": "client1.domain.tld",
                "Status": {
                    "Code": "terminated"
                },
                "ConnectionEndTime": "2019-08-12 07:58:34"
            },
            {
                "ClientVpnEndpointId": "cvpn-endpoint-123456789123abcde",
                "Timestamp": "2019-08-12 08:02:54",
                "ConnectionId": "cvpn-connection-00668867a40f18253",
                "ConnectionEstablishedTime": "2019-08-12 08:02:53",
                "IngressBytes": "2951",
                "EgressBytes": "2611",
                "IngressPackets": "9",
                "EgressPackets": "6",
                "ClientIp": "172.31.0.226",
                "CommonName": "client1.domain.tld",
                "Status": {
                    "Code": "active"
                },
                "ConnectionEndTime": "-"
            }
        ]
    }

For more information, see `Client Connections <https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-connections.html>`__ in the *AWS Client VPN Administrator Guide*.
