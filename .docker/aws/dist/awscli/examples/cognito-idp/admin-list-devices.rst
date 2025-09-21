**To list devices for a user**

The following ``admin-list-devices`` example lists devices for the user diego. ::

    aws cognito-idp admin-list-devices \
        --user-pool-id us-west-2_EXAMPLE \
        --username diego \
        --limit 1

Output::

    {
        "Devices": [
            {
                "DeviceKey": "us-west-2_a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "DeviceAttributes": [
                    {
                        "Name": "device_status",
                        "Value": "valid"
                    },
                    {
                        "Name": "device_name",
                        "Value": "MyDevice"
                    },
                    {
                        "Name": "dev:device_arn",
                        "Value": "arn:aws:cognito-idp:us-west-2:123456789012:owner/diego.us-west-2_EXAMPLE/device/us-west-2_a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
                    },
                    {
                        "Name": "dev:device_owner",
                        "Value": "diego.us-west-2_EXAMPLE"
                    },
                    {
                        "Name": "last_ip_used",
                        "Value": "192.0.2.1"
                    },
                    {
                        "Name": "dev:device_remembered_status",
                        "Value": "remembered"
                    },
                    {
                        "Name": "dev:device_sdk",
                        "Value": "aws-sdk"
                    }
                ],
                "DeviceCreateDate": 1715100742.022,
                "DeviceLastModifiedDate": 1723233651.167,
                "DeviceLastAuthenticatedDate": 1715100742.0
            }
        ]
    }

For more information, see `Working with user devices in your user pool <https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-device-tracking.html>`__ in the *Amazon Cognito Developer Guide*.
