**To update the IAM role of a managed instance**

The following ``update-managed-instance-role`` example updates the IAM instance profile of a managed instance. ::

    aws ssm update-managed-instance-role \
        --instance-id "mi-08ab247cdfEXAMPLE" \
        --iam-role "ExampleRole"

This command produces no output.

For more information, see `Step 4: Create an IAM Instance Profile for Systems Manager <https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-instance-profile.html>`__ in the *AWS Systems Manager User Guide*.
