**To add a user to an IAM group**

The following ``add-user-to-group`` command adds an IAM user named ``Bob`` to the IAM group named ``Admins``. ::

    aws iam add-user-to-group \
        --user-name Bob \
        --group-name Admins

This command produces no output.

For more information, see `Adding and removing users in an IAM user group <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_groups_manage_add-remove-users.html>`__ in the *AWS IAM User Guide*.
