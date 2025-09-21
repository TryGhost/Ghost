**To list the policies attached to an IAM role**

The following ``list-role-policies`` command lists the names of the permissions policies for the specified IAM role. ::

    aws iam list-role-policies \
        --role-name Test-Role

Output::

    {
        "PolicyNames": [
            "ExamplePolicy"
        ]
    }

To see the trust policy attached to a role, use the ``get-role`` command. To see the details of a permissions policy, use the ``get-role-policy`` command. 

For more information, see `Creating IAM roles <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create.html>`__ in the *AWS IAM User Guide*.