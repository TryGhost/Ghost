**To disassociate the role from a Greengrass group**

The following ``disassociate-role-from-group`` example disassociates the IAM role from the specified Greengrass group. ::

    aws greengrass disassociate-role-from-group \
        --group-id 2494ee3f-7f8a-4e92-a78b-d205f808b84b

Output::

    {
        "DisassociatedAt": "2019-09-10T20:05:49Z"
    }

For more information, see `Configure the Group Role <https://docs.aws.amazon.com/greengrass/latest/developerguide/config-iam-roles.html>`__ in the *AWS IoT Greengrass Developer Guide*.
