**Example 1: To apply a permissions boundary based on a custom policy to an IAM user**

The following ``put-user-permissions-boundary`` example applies a custom policy named ``intern-boundary`` as the permissions boundary for the specified IAM user. ::

    aws iam put-user-permissions-boundary \
        --permissions-boundary arn:aws:iam::123456789012:policy/intern-boundary \
        --user-name intern

This command produces no output.

**Example 2: To apply a permissions boundary based on an AWS managed policy to an IAM user**

The following ``put-user-permissions-boundary`` example applies the AWS managed pollicy named ``PowerUserAccess`` as the permissions boundary for the specified IAM user. ::

    aws iam put-user-permissions-boundary \
        --permissions-boundary arn:aws:iam::aws:policy/PowerUserAccess \
        --user-name developer

This command produces no output.

For more information, see `Adding and removing IAM identity permissions <https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_manage-attach-detach.html>`__ in the *AWS IAM User Guide*.