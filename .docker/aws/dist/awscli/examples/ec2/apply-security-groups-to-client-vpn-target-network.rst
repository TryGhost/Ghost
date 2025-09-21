**To apply security groups to a target network for a Client VPN endpoint**

The following ``apply-security-groups-to-client-vpn-target-network`` example applies security group ``sg-01f6e627a89f4db32`` to the association between the specified target network and Client VPN endpoint. ::

    aws ec2 apply-security-groups-to-client-vpn-target-network \
        --security-group-ids sg-01f6e627a89f4db32 \
        --vpc-id vpc-0e2110c2f324332e0 \
        --client-vpn-endpoint-id cvpn-endpoint-123456789123abcde

Output::

    {
        "SecurityGroupIds": [
            "sg-01f6e627a89f4db32"
        ]
    }

For more information, see `Target Networks <https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-target.html>`__ in the *AWS Client VPN Administrator Guide*.
