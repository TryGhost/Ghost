**To terminate a connection to a Client VPN endpoint**

The following ``terminate-client-vpn-connections`` example terminates the specified connection to the Client VPN endpoint. ::

    aws ec2 terminate-client-vpn-connections \
        --client-vpn-endpoint-id vpn-endpoint-123456789123abcde \
        --connection-id cvpn-connection-04edd76f5201e0cb8

Output::

    {
        "ClientVpnEndpointId": "vpn-endpoint-123456789123abcde",
        "ConnectionStatuses": [
            {
                "ConnectionId": "cvpn-connection-04edd76f5201e0cb8",
                "PreviousStatus": {
                    "Code": "active"
                },
                "CurrentStatus": {
                    "Code": "terminating"
                }
            }
        ]
    }

For more information, see `Client Connections <https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-connections.html>`__ in the *AWS Client VPN Administrator Guide*.
