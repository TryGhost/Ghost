**To change an IAM user's name**

The following ``update-user`` command changes the name of the IAM user ``Bob`` to ``Robert``. ::

    aws iam update-user \
        --user-name Bob \
        --new-user-name Robert

This command produces no output.

For more information, see `Renaming an IAM user group <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_groups_manage_rename.html>`__ in the *AWS IAM User Guide*.