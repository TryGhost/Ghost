**To revoke an authorization rule for a Client VPN endpoint**

The following ``revoke-client-vpn-ingress`` example revokes a rule for internet access (``0.0.0.0/0``) for all groups. ::

    aws ec2 revoke-client-vpn-ingress \
        --client-vpn-endpoint-id cvpn-endpoint-123456789123abcde \
        --target-network-cidr 0.0.0.0/0 --revoke-all-groups

Output::

    {
        "Status": {
            "Code": "revoking"
        }
    }

For more information, see `Authorization Rules <https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-rules.html>`__ in the *AWS Client VPN Administrator Guide*.
