**To remove a user from an IAM group**

The following ``remove-user-from-group`` command removes the user named ``Bob`` from the IAM group named ``Admins``. ::

    aws iam remove-user-from-group \
        --user-name Bob \
        --group-name Admins

This command produces no output.

For more information, see `Adding and removing users in an IAM user group <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_groups_manage_add-remove-users.html>`__ in the *AWS IAM User Guide*.