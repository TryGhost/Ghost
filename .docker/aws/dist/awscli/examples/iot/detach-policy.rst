**Example 1: To detach an AWS IoT policy from a thing group**

The following ``detach-policy`` example detaches the specified policy from a thing group and, by extension, from all things in that group and any of the group's child groups. ::

    aws iot detach-policy \
        --target "arn:aws:iot:us-west-2:123456789012:thinggroup/LightBulbs" \
        --policy-name "MyFirstGroup_Core-policy"

This command produces no output.

For more information, see `Thing Groups <https://docs.aws.amazon.com/iot/latest/developerguide/thing-groups.html>`__ in the *AWS IoT Developers Guide*.

**Example 2: To detach an AWS IoT policy from a device certificate**

The following ``detach-policy`` example detaches the TemperatureSensorPolicy policy from a device certificate identified by ARN. ::

    aws iot detach-policy \
        --policy-name TemperatureSensorPolicy \
        --target arn:aws:iot:us-west-2:123456789012:cert/488b6a7f2acdeb00a77384e63c4e40b18b1b3caaae57b7272ba44c45e3448142

This command produces no output.