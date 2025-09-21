**To modify document permissions**

The following ``modify-document-permission`` example shares a Systems Manager document publicly. ::

    aws ssm modify-document-permission \
        --name "Example" \
        --permission-type "Share" \
        --account-ids-to-add "All"

This command produces no output.

For more information, see `Share a Systems Manager Document <https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-how-to-share.html>`__ in the *AWS Systems Manager User Guide*.
