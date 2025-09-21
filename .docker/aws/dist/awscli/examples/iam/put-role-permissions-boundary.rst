**Example 1: To apply a permissions boundary based on a custom policy to an IAM role**

The following ``put-role-permissions-boundary`` example applies the custom policy named ``intern-boundary`` as the permissions boundary for the specified IAM role. ::

    aws iam put-role-permissions-boundary \
        --permissions-boundary arn:aws:iam::123456789012:policy/intern-boundary \
        --role-name lambda-application-role

This command produces no output.

**Example 2: To apply a permissions boundary based on an AWS managed policy to an IAM role**

The following ``put-role-permissions-boundary`` example applies the AWS managed ``PowerUserAccess`` policy as the permissions boundary for the specified IAM role. ::

    aws iam put-role-permissions-boundary \
        --permissions-boundary arn:aws:iam::aws:policy/PowerUserAccess \
        --role-name x-account-admin

This command produces no output.

For more information, see `Modifying a role <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_manage_modify.html>`__ in the *AWS IAM User Guide*.