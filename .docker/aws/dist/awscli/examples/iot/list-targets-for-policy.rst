**To list the principals associated with an AWS IoT policy**

The following ``list-targets-for-policy`` example lists the device certificates to which the specified policy is attached. ::

    aws iot list-targets-for-policy \
        --policy-name UpdateDeviceCertPolicy

Output::

    {
        "targets": [
            "arn:aws:iot:us-west-2:123456789012:cert/488b6a7f2acdeb00a77384e63c4e40b18b1b3caaae57b7272ba44c45e3448142",
            "arn:aws:iot:us-west-2:123456789012:cert/d1eb269fb55a628552143c8f96eb3c258fcd5331ea113e766ba0c82bf225f0be"
        ]
    }

For more information, see `Thing Groups <https://docs.aws.amazon.com/iot/latest/developerguide/thing-groups.html>`__ in the *AWS IoT Developers Guide*.
