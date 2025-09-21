**To list gateway devices with a sample configuration file**

The following ``get-vpn-connection-device-types`` example lists the gateway devices from Palo Alto Networks that have sample configuration files. ::

    aws ec2 get-vpn-connection-device-types \
        --query "VpnConnectionDeviceTypes[?Vendor==`Palo Alto Networks`]"

Output::

    [
        {
            "VpnConnectionDeviceTypeId": "754a6372",
            "Vendor": "Palo Alto Networks",
            "Platform": "PA Series",
            "Software": "PANOS 4.1.2+"
        },
        {
            "VpnConnectionDeviceTypeId": "9612cbed",
            "Vendor": "Palo Alto Networks",
            "Platform": "PA Series",
            "Software": "PANOS 4.1.2+ (GUI)"
        },
        {
            "VpnConnectionDeviceTypeId": "5fb390ba",
            "Vendor": "Palo Alto Networks",
            "Platform": "PA Series",
            "Software": "PANOS 7.0+"
        }
    ]

For more information, see `Download the configuration file <https://docs.aws.amazon.com/vpn/latest/s2svpn/SetUpVPNConnections.html#vpn-download-config>`__ in the *AWS Site-to-Site VPN user Guide*.
