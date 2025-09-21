**To update connectivity information for a Greengrass core device**

The following ``update-connectivity-info`` example gets the connectivity information for a Greengrass core device. Client devices use this information to connect to the MQTT broker that runs on this core device. ::

    aws greengrassv2 update-connectivity-info \
        --thing-name MyGreengrassCore \
        --cli-input-json file://core-device-connectivity-info.json

Contents of ``core-device-connectivity-info.json``::

    {
        "connectivityInfo": [ 
            { 
                "hostAddress": "192.0.2.0",
                "portNumber": 8883,
                "id": "localIP_192.0.2.0"
            }
        ]
    }

Output::

    {
        "version": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
    }

For more information, see `Manage core device endpoints <https://docs.aws.amazon.com/greengrass/v2/developerguide/manage-core-device-endpoints.html>`__ in the *AWS IoT Greengrass V2 Developer Guide*.