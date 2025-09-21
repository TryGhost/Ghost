**To list the wireless gateway task definitions**

The following ``list-wireless-gateway-task-definitions`` example lists the available wireless gateway task definitions registered to your AWS account. ::

    aws iotwireless list-wireless-gateway-task-definitions

Output::

    {
        "TaskDefinitions": [
            {
                "Id": "b7d3baad-25c7-35e7-a4e1-1683a0d61da9", 
                "LoRaWAN" :
                    {
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
        ]
    }

For more information, see `Connecting devices and gateways to AWS IoT Core for LoRaWAN <https://docs.aws.amazon.com/iot/latest/developerguide/connect-iot-lorawan.html>`__ in the *AWS IoT Developers Guide*.