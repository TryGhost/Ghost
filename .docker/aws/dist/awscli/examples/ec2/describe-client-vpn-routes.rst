**To describe the routes for a Client VPN endpoint**

The following ``describe-client-vpn-routes`` example displays details about the routes for the specified Client VPN endpoint. ::

    aws ec2 describe-client-vpn-routes \
        --client-vpn-endpoint-id cvpn-endpoint-123456789123abcde

Output::

    {
        "Routes": [
            {
                "ClientVpnEndpointId": "cvpn-endpoint-123456789123abcde",
                "DestinationCidr": "10.0.0.0/16",
                "TargetSubnet": "subnet-0123456789abcabca",
                "Type": "Nat",
                "Origin": "associate",
                "Status": {
                    "Code": "active"
                },
                "Description": "Default Route"
            },
            {
                "ClientVpnEndpointId": "cvpn-endpoint-123456789123abcde",
                "DestinationCidr": "0.0.0.0/0",
                "TargetSubnet": "subnet-0123456789abcabca",
                "Type": "Nat",
                "Origin": "add-route",
                "Status": {
                    "Code": "active"
                }
            }
        ]
    }

For more information, see `Routes <https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-routes.html>`__ in the *AWS Client VPN Administrator Guide*.
