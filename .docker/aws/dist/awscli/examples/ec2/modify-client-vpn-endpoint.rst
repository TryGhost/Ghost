**To modify a Client VPN endpoint**

The following ``modify-client-vpn-endpoint`` example enables client connection logging for the specified Client VPN endpoint. ::

    aws ec2 modify-client-vpn-endpoint \
        --client-vpn-endpoint-id cvpn-endpoint-123456789123abcde \
        --connection-log-options Enabled=true,CloudwatchLogGroup=ClientVPNLogs

Output::

    {
        "Return": true
    }

For more information, see `Client VPN Endpoints <https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-endpoints.html>`__ in the *AWS Client VPN Administrator Guide*.
