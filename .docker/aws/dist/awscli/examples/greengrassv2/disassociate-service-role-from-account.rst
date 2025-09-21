**To disassociate the Greengrass service role from your AWS account**

The following ``disassociate-service-role-from-account`` example disassociates the Greengrass service role from AWS IoT Greengrass for your AWS account. ::

    aws greengrassv2 disassociate-service-role-from-account

Output::

    {
        "disassociatedAt": "2022-01-19T19:26:09Z"
    }

For more information, see `Greengrass service role <https://docs.aws.amazon.com/greengrass/v2/developerguide/greengrass-service-role.html>`__ in the *AWS IoT Greengrass V2 Developer Guide*.