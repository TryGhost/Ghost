**To associate the Greengrass service role to your AWS account**

The following ``associate-service-role-to-account`` example associates a service role with AWS IoT Greengrass for your AWS account. ::

    aws greengrassv2 associate-service-role-to-account \
        --role-arn arn:aws:iam::123456789012:role/service-role/Greengrass_ServiceRole

Output::

    {
        "associatedAt": "2022-01-19T19:21:53Z"
    }

For more information, see `Greengrass service role <https://docs.aws.amazon.com/greengrass/v2/developerguide/greengrass-service-role.html>`__ in the *AWS IoT Greengrass V2 Developer Guide*.