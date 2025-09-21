**To retrieve the details for the service role that is attached to your account**

The following ``get-service-role-for-account`` example retrieves information about the service role that is attached to your AWS account. ::

    aws greengrass get-service-role-for-account
    
Output::

    {
        "AssociatedAt": "2018-10-18T15:59:20Z",
        "RoleArn": "arn:aws:iam::123456789012:role/service-role/Greengrass_ServiceRole"
    }

For more information, see `Greengrass Service Role <https://docs.aws.amazon.com/greengrass/latest/developerguide/service-role.html>`__ in the **AWS IoT Greengrass Developer Guide**.
