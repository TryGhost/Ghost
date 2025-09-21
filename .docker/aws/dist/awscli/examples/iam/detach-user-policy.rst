**To detach a policy from a user**

This example removes the managed policy with the ARN ``arn:aws:iam::123456789012:policy/TesterPolicy`` from the user ``Bob``. ::

    aws iam detach-user-policy \
        --user-name Bob \
        --policy-arn arn:aws:iam::123456789012:policy/TesterPolicy 

This command produces no output.

For more information, see `Changing permissions for an IAM user <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_change-permissions.html>`__ in the *AWS IAM User Guide*.