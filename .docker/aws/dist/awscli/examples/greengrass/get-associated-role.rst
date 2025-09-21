**To get the role associated with a Greengrass group**

The following ``get-associated-role`` example gets the IAM role that's associated with the specified Greengrass group. The group role is used by local Lambda functions and connectors to access AWS services. ::

    aws greengrass get-associated-role \
        --group-id 2494ee3f-7f8a-4e92-a78b-d205f808b84b

Output::

    {
        "RoleArn": "arn:aws:iam::123456789012:role/GG-Group-Role",
        "AssociatedAt": "2019-09-10T20:03:30Z"
    }

For more information, see `Configure the Group Role <https://docs.aws.amazon.com/greengrass/latest/developerguide/config-iam-roles.html>`__ in the *AWS IoT Greengrass Developer Guide*.
