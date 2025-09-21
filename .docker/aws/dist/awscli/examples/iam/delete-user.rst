**To delete an IAM user**

The following ``delete-user`` command removes the IAM user named ``Bob`` from the current account. ::

    aws iam delete-user \
        --user-name Bob

This command produces no output.

For more information, see `Deleting an IAM user <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_manage.html#id_users_deleting>`__ in the *AWS IAM User Guide*.