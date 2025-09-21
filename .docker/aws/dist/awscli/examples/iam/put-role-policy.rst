**To attach a permissions policy to an IAM role**

The following ``put-role-policy`` command adds a permissions policy to the role named ``Test-Role``. ::

    aws iam put-role-policy \
        --role-name Test-Role \
        --policy-name ExamplePolicy \
        --policy-document file://AdminPolicy.json

This command produces no output.

The policy is defined as a JSON document in the *AdminPolicy.json* file. (The file name and extension do not have significance.)

To attach a trust policy to a role, use the ``update-assume-role-policy`` command.

For more information, see `Modifying a role <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_manage_modify.html>`__ in the *AWS IAM User Guide*.