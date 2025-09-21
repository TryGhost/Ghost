**To rename an IAM group**

The following ``update-group`` command changes the name of the IAM group ``Test`` to ``Test-1``. ::

    aws iam update-group \
        --group-name Test \
        --new-group-name Test-1

This command produces no output.

For more information, see `Renaming an IAM user group <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_groups_manage_rename.html>`__ in the *AWS IAM User Guide*.