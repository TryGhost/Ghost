**To delete a Client VPN endpoint**

The following ``delete-client-vpn-endpoint`` example deletes the specified Client VPN endpoint. ::

    aws ec2 delete-client-vpn-endpoint \
        --client-vpn-endpoint-id cvpn-endpoint-123456789123abcde

Output::

    {
        "Status": {
            "Code": "deleting"
        }
    }

For more information, see `Client VPN Endpoints <https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-endpoints.html>`__ in the *AWS Client VPN Administrator Guide*.
