**To delete a route for a Client VPN endpoint**

The following ``delete-client-vpn-route`` example deletes the ``0.0.0.0/0`` route for the specified subnet of a Client VPN endpoint. ::

    aws ec2 delete-client-vpn-route \
        --client-vpn-endpoint-id cvpn-endpoint-123456789123abcde \
        --destination-cidr-block 0.0.0.0/0 \
        --target-vpc-subnet-id subnet-0123456789abcabca

Output::

    {
        "Status": {
            "Code": "deleting"
        }
    }

For more information, see `Routes <https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-routes.html>`__ in the *AWS Client VPN Administrator Guide*.
