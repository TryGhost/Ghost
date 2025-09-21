**To get information about a wireless gateway task definition**

The following ``get-wireless-gateway-task-definition`` example gets information about the wireless task definition with the specified ID. ::

    aws iotwireless get-wireless-gateway-task-definition \
        --id "b7d3baad-25c7-35e7-a4e1-1683a0d61da9"

Output::

    {
        "AutoCreateTasks": true,
        "Name": "TestAutoUpdate",
        "Update":{
            "UpdateDataSource" : "s3://cupsalphagafirmwarebin/station",
            "UpdateDataRole" : "arn:aws:iam::001234567890:role/SDK_Test_Role",
            "LoRaWAN" :{
                "CurrentVersion" :{
                    "PackageVersion" : "1.0.0",
                    "Station" : "2.0.5",
                    "Model" : "linux"
                },
                "UpdateVersion" :{
                    "PackageVersion" : "1.0.1",
                    "Station" : "2.0.5",
                    "Model" : "minihub"
                }
            }
        }
    }

For more information, see `Connecting devices and gateways to AWS IoT Core for LoRaWAN <https://docs.aws.amazon.com/iot/latest/developerguide/connect-iot-lorawan.html>`__ in the *AWS IoT Developers Guide*.