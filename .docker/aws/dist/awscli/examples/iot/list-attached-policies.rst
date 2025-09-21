**Example 1: To list the policies attached to a group**

The following ``list-attached-policies`` example lists the policies that are attached to the specified group. ::

    aws iot list-attached-policies \
        --target "arn:aws:iot:us-west-2:123456789012:thinggroup/LightBulbs"

Output::

    {
        "policies": [
            {
                "policyName": "UpdateDeviceCertPolicy",
                "policyArn": "arn:aws:iot:us-west-2:123456789012:policy/UpdateDeviceCertPolicy"
            }
        ]
    }

For more information, see `Thing Groups <https://docs.aws.amazon.com/iot/latest/developerguide/thing-groups.html>`__ in the *AWS IoT Developers Guide*.

**Example 2: To list the policies attached to a device certificate**

The following ``list-attached-policies`` example lists the AWS IoT policies attached to the device certificate. The certificate is identified by its ARN. ::

    aws iot list-attached-policies \
        --target arn:aws:iot:us-west-2:123456789012:cert/488b6a7f2acdeb00a77384e63c4e40b18b1b3caaae57b7272ba44c45e3448142

Output::

    {
        "policies": [
            {
                "policyName": "TemperatureSensorPolicy",
                "policyArn": "arn:aws:iot:us-west-2:123456789012:policy/TemperatureSensorPolicy"
            }
        ]
    }

For more information, see `Thing Groups <https://docs.aws.amazon.com/iot/latest/developerguide/thing-groups.html>`__ in the *AWS IoT Developers Guide*.
