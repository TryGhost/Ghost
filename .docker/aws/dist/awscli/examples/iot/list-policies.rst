**To list the policies defined in your AWS account**

The following ``list-policies`` example lists all policies defined in your AWS account. ::

    aws iot list-policies

Output::

    {
        "policies": [
            {
                "policyName": "UpdateDeviceCertPolicy",
                "policyArn": "arn:aws:iot:us-west-2:123456789012:policy/UpdateDeviceCertPolicy"
            },
            {
                "policyName": "PlantIoTPolicy",
                "policyArn": "arn:aws:iot:us-west-2:123456789012:policy/PlantIoTPolicy"
            },
            {
                "policyName": "MyPiGroup_Core-policy",
                "policyArn": "arn:aws:iot:us-west-2:123456789012:policy/MyPiGroup_Core-policy"
            }
        ]
    }

For more information, see `AWS IoT Policies <https://docs.aws.amazon.com/iot/latest/developerguide/iot-policies.html>`__ in the *AWS IoT Developers Guide*.

