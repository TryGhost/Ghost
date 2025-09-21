**To disassociate a service role from your AWS account**

The following ``disassociate-service-role-from-account`` example removes the service role that is associated with your AWS account. If you are not using the service role in any AWS Region, use the ``delete-role-policy`` command to detach the ``AWSGreengrassResourceAccessRolePolicy`` managed policy from the role, and then use the ``delete-role`` command to delete the role. ::

    aws greengrass disassociate-service-role-from-account

Output::

    {
        "DisassociatedAt": "2019-06-25T22:12:55Z"
    }

For more information, see `Greengrass Service Role <https://docs.aws.amazon.com/greengrass/latest/developerguide/service-role.html>`__ in the **AWS IoT Greengrass Developer Guide**.
