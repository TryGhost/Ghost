**To get firmware information about a wireless gateway**

The following ``get-wireless-gateway-firmware-information`` example gets firmware version and other information about a wireless gateway. ::

    aws iotwireless get-wireless-gateway-firmware-information \
        --id "3039b406-5cc9-4307-925b-9948c63da25b"


Output::

    {
        "LoRaWAN" :{
            "CurrentVersion" :{
                "PackageVersion" : "1.0.0",
                "Station" : "2.0.5",
                "Model" : "linux"
            }
        }
    }

For more information, see `Connecting devices and gateways to AWS IoT Core for LoRaWAN <https://docs.aws.amazon.com/iot/latest/developerguide/connect-iot-lorawan.html>`__ in the *AWS IoT Developers Guide*.
