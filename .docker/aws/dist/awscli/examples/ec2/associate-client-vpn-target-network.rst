**To associate a target network with a Client VPN endpoint**

The following ``associate-client-vpn-target-network`` example associates a subnet with the specified Client VPN endpoint. ::

    aws ec2 associate-client-vpn-target-network \
        --subnet-id subnet-0123456789abcabca \
        --client-vpn-endpoint-id cvpn-endpoint-123456789123abcde

Output::

    {
        "AssociationId": "cvpn-assoc-12312312312312312",
        "Status": {
            "Code": "associating"
        }
    }

For more information, see `Target Networks <https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-target.html>`__ in the *AWS Client VPN Administrator Guide*.
