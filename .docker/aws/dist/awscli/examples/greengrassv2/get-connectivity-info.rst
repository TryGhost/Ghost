**To get the connectivity information for a Greengrass core device**

The following ``get-connectivity-info`` example gets the connectivity information for a Greengrass core device. Client devices use this information to connect to the MQTT broker that runs on this core device. ::

    aws greengrassv2 get-connectivity-info \
        --thing-name MyGreengrassCore

Output::

    {
        "connectivityInfo": [
            {
                "id": "localIP_192.0.2.0",
                "hostAddress": "192.0.2.0",
                "portNumber": 8883
            }
        ]
    }

For more information, see `Manage core device endpoints <https://docs.aws.amazon.com/greengrass/v2/developerguide/manage-core-device-endpoints.html>`__ in the *AWS IoT Greengrass V2 Developer Guide*.