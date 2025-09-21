**To detach a policy from a group**

This example removes the managed policy with the ARN ``arn:aws:iam::123456789012:policy/TesterAccessPolicy`` from the group called ``Testers``. ::

    aws iam detach-group-policy \
        --group-name Testers \
        --policy-arn arn:aws:iam::123456789012:policy/TesterAccessPolicy

This command produces no output.

For more information, see `Managing IAM user groups <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_groups_manage.html>`__ in the *AWS IAM User Guide*.