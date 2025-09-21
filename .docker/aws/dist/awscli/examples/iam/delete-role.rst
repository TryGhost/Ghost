**To delete an IAM role**

The following ``delete-role`` command removes the role named ``Test-Role``. ::

    aws iam delete-role \
        --role-name Test-Role

This command produces no output.

Before you can delete a role, you must remove the role from any instance profile (``remove-role-from-instance-profile``), detach any managed policies (``detach-role-policy``) and delete any inline policies that are attached to the role (``delete-role-policy``).

For more information, see `Creating IAM roles <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create.html>`__ and `Using instance profiles <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2_instance-profiles.html>`__ in the *AWS IAM User Guide*.