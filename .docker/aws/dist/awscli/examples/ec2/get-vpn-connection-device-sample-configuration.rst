**To download a sample configuration file**

The following ``get-vpn-connection-device-sample-configuration`` example downloads the specified sample configuration file. To list the gateway devices with a sample configuration file, call the ``get-vpn-connection-device-types`` command. ::

    aws ec2 get-vpn-connection-device-sample-configuration \
        --vpn-connection-id vpn-123456789abc01234 \
        --vpn-connection-device-type-id 5fb390ba

Output::

    {
        "VpnConnectionDeviceSampleConfiguration": "contents-of-the-sample-configuration-file"
    }

For more information, see `Download the configuration file <https://docs.aws.amazon.com/vpn/latest/s2svpn/SetUpVPNConnections.html#vpn-download-config>`__ in the *AWS Site-to-Site VPN User Guide*.
