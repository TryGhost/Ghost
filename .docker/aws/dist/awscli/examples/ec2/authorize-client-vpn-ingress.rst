**To add an authorization rule for a Client VPN endpoint**

The following ``authorize-client-vpn-ingress`` example adds an ingress authorization rule that permits all clients to access the internet (``0.0.0.0/0``). ::

    aws ec2 authorize-client-vpn-ingress \
        --client-vpn-endpoint-id cvpn-endpoint-123456789123abcde \
        --target-network-cidr 0.0.0.0/0 \
        --authorize-all-groups

Output::

    {
        "Status": {
            "Code": "authorizing"
        }
    }

For more information, see `Authorization Rules <https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-rules.html>`__ in the *AWS Client VPN Administrator Guide*.
