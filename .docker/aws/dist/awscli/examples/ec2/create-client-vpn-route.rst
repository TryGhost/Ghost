**To create a route for a Client VPN endpoint**

The following ``create-client-vpn-route`` example adds a route to the internet (``0.0.0.0/0``) for the specified subnet of the Client VPN endpoint. ::

    aws ec2 create-client-vpn-route \
        --client-vpn-endpoint-id cvpn-endpoint-123456789123abcde \
        --destination-cidr-block 0.0.0.0/0  \
        --target-vpc-subnet-id subnet-0123456789abcabca

Output::

    {
        "Status": {
            "Code": "creating"
        }
    }

For more information, see `Routes <https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-routes.html>`__ in the *AWS Client VPN Administrator Guide*.
