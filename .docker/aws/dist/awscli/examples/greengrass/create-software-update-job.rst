**To create a software update job for a core**

The following ``create-software-update-job`` example creates an over-the-air (OTA) update job to update the AWS IoT Greengrass Core software on the core whose name is ``MyFirstGroup_Core``. This command requires an IAM role that allows access to software update packages in Amazon S3 and includes ``iot.amazonaws.com`` as a trusted entity.  ::

    aws greengrass create-software-update-job \
        --update-targets-architecture armv7l \
        --update-targets [\"arn:aws:iot:us-west-2:123456789012:thing/MyFirstGroup_Core\"] \
        --update-targets-operating-system raspbian \
        --software-to-update core \
        --s3-url-signer-role arn:aws:iam::123456789012:role/OTA_signer_role \
        --update-agent-log-level WARN

Output::

    {
        "IotJobId": "GreengrassUpdateJob_30b353e3-3af7-4786-be25-4c446663c09e",
        "IotJobArn": "arn:aws:iot:us-west-2:123456789012:job/GreengrassUpdateJob_30b353e3-3af7-4786-be25-4c446663c09e",
        "PlatformSoftwareVersion": "1.9.3"
    }

For more information, see `OTA Updates of AWS IoT Greengrass Core Software <https://docs.aws.amazon.com/greengrass/latest/developerguide/core-ota-update.html>`__ in the *AWS IoT Greengrass Developer Guide*.
