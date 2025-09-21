**To disassociate a network from a Client VPN endpoint**

The following ``disassociate-client-vpn-target-network`` example disassociates the target network that's associated with the ``cvpn-assoc-12312312312312312`` association ID for the specified Client VPN endpoint. ::

    aws ec2 disassociate-client-vpn-target-network \
        --client-vpn-endpoint-id cvpn-endpoint-123456789123abcde \
        --association-id cvpn-assoc-12312312312312312

Output::

    {
        "AssociationId": "cvpn-assoc-12312312312312312",
        "Status": {
            "Code": "disassociating"
        }
    }

For more information, see `Target Networks <https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-target.html>`__ in the *AWS Client VPN Administrator Guide*.
