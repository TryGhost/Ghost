**To create a Client VPN endpoint**

The following ``create-client-vpn-endpoint`` example creates a Client VPN endpoint that uses mutual authentication and specifies a value for the client CIDR block. ::

    aws ec2 create-client-vpn-endpoint \
        --client-cidr-block "172.31.0.0/16" \
        --server-certificate-arn arn:aws:acm:ap-south-1:123456789012:certificate/a1b2c3d4-5678-90ab-cdef-11111EXAMPLE \
        --authentication-options Type=certificate-authentication,MutualAuthentication={ClientRootCertificateChainArn=arn:aws:acm:ap-south-1:123456789012:certificate/a1b2c3d4-5678-90ab-cdef-22222EXAMPLE} \
        --connection-log-options Enabled=false

Output::

    {
        "ClientVpnEndpointId": "cvpn-endpoint-123456789123abcde",
        "Status": {
            "Code": "pending-associate"
        },
        "DnsName": "cvpn-endpoint-123456789123abcde.prod.clientvpn.ap-south-1.amazonaws.com"
    }

For more information, see `Client VPN Endpoints <https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-endpoints.html>`__ in the *AWS Client VPN Administrator Guide*.
