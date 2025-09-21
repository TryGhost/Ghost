**To associate a service role with your AWS account**

The following ``associate-service-role-to-account`` example associates an IAM service role, specified by its ARN, with AWS IoT Greengrass in your AWS account.  You must have previously created the service role in IAM, and you must associate a policy document with it that allows AWS IoT Greengrass to assume this role. ::

    aws greengrass associate-service-role-to-account \
        --role-arn "arn:aws:iam::123456789012:role/service-role/Greengrass_ServiceRole"

Output::

    {
        "AssociatedAt": "2019-06-25T18:12:45Z"
    }

For more information, see `Greengrass Service Role <https://docs.aws.amazon.com/greengrass/latest/developerguide/service-role.html>`__ in the *AWS IoT Greengrass Developer Guide*.
