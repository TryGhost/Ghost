**To get the Greengrass service role for your AWS account**

The following ``get-service-role-for-account`` example gets the service role that's associated with AWS IoT Greengrass for your AWS account. ::

    aws greengrassv2 get-service-role-for-account

Output::

    {
        "associatedAt": "2022-01-19T19:21:53Z",
        "roleArn": "arn:aws:iam::123456789012:role/service-role/Greengrass_ServiceRole"
    }

For more information, see `Greengrass service role <https://docs.aws.amazon.com/greengrass/v2/developerguide/greengrass-service-role.html>`__ in the *AWS IoT Greengrass V2 Developer Guide*.