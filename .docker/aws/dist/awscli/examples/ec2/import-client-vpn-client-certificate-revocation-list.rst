**To import a client certificate revocation list**

The following ``import-client-vpn-client-certificate-revocation-list`` example imports a client certificate revocation list to the Client VPN endpoint by specifying the location of the file on the local computer. ::

    aws ec2 import-client-vpn-client-certificate-revocation-list \
        --certificate-revocation-list file:///path/to/crl.pem \
        --client-vpn-endpoint-id cvpn-endpoint-123456789123abcde

Output::

    {
        "Return": true
    }

For more information, see `Client Certificate Revocation Lists <https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-certificates.html>`__ in the *AWS Client VPN Administrator Guide*.
