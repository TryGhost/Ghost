**To list a user's devices**

The following ``list-devices`` example lists the devices that the current user has registered. ::

    aws cognito-idp list-devices \
        --access-token eyJra456defEXAMPLE

Output::

    {
        "Devices": [
            {
                "DeviceAttributes": [
                    {
                        "Name": "device_status",
                        "Value": "valid"
                    },
                    {
                        "Name": "device_name",
                        "Value": "Dart-device"
                    },
                    {
                        "Name": "last_ip_used",
                        "Value": "192.0.2.1"
                    }
                ],
                "DeviceCreateDate": 1715100742.022,
                "DeviceKey": "us-west-2_a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "DeviceLastAuthenticatedDate": 1715100742.0,
                "DeviceLastModifiedDate": 1723233651.167
            },
            {
                "DeviceAttributes": [
                    {
                        "Name": "device_status",
                        "Value": "valid"
                    },
                    {
                        "Name": "last_ip_used",
                        "Value": "192.0.2.2"
                    }
                ],
                "DeviceCreateDate": 1726856147.993,
                "DeviceKey": "us-west-2_a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "DeviceLastAuthenticatedDate": 1726856147.0,
                "DeviceLastModifiedDate": 1726856147.993
            }
        ]
    }

For more information, see `Working with devices <https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-device-tracking.html>`__ in the *Amazon Cognito Developer Guide*.
