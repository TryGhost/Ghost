**To remove a policy from an IAM role**

The following ``delete-role-policy`` command removes the policy named ``ExamplePolicy`` from the role named ``Test-Role``. ::

    aws iam delete-role-policy \
        --role-name Test-Role \
        --policy-name ExamplePolicy

This command produces no output.

For more information, see `Modifying a role <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_manage_modify.html>`__ in the *AWS IAM User Guide*.