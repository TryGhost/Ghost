**To delete a permissions boundary from an IAM user**

The following ``delete-user-permissions-boundary`` example deletes the permissions boundary attached to the IAM user named ``intern``. To apply a permissions boundary to a user, use the ``put-user-permissions-boundary`` command. ::

    aws iam delete-user-permissions-boundary \
        --user-name intern

This command produces no output.

For more information, see `Policies and permissions in IAM <https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html>`__ in the *AWS IAM User Guide*.