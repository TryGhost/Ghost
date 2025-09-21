**To associate the certificate with the wireless gateway**

The following ``associate-wireless-gateway-with-certificate`` associates a wireless gateway with a certificate. ::

    aws iotwireless associate-wireless-gateway-with-certificate \
        --id "12345678-a1b2-3c45-67d8-e90fa1b2c34d" \
        --iot-certificate-id "a123b45c6d78e9f012a34cd5e6a7890b12c3d45e6f78a1b234c56d7e890a1234"

Output::

    {
        "IotCertificateId": "a123b45c6d78e9f012a34cd5e6a7890b12c3d45e6f78a1b234c56d7e890a1234"
    }

For more information, see `Add your gateways and wireless devices to AWS IoT Core for LoRaWAN <https://docs.aws.amazon.com/iot/latest/developerguide/connect-iot-lorawan-onboard-devices.html>`__ in the *AWS IoT Developers Guide*.