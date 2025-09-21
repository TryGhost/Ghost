**To describe the authorization rules for a Client VPN endpoint**

The following ``describe-client-vpn-authorization-rules`` example displays details about the authorization rules for the specified Client VPN endpoint. ::

    aws ec2 describe-client-vpn-authorization-rules \
        --client-vpn-endpoint-id cvpn-endpoint-123456789123abcde

Output::

    {
        "AuthorizationRules": [
            {
                "ClientVpnEndpointId": "cvpn-endpoint-123456789123abcde",
                "GroupId": "",
                "AccessAll": true,
                "DestinationCidr": "0.0.0.0/0",
                "Status": {
                    "Code": "active"
                }
            }
        ]
    }

For more information, see `Authorization Rules <https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-rules.html>`__ in the *AWS Client VPN Administrator Guide*.
