**Example: To approve the latest version of a change template**

The following ``update-document-metadata`` provides an approval for the latest version of a change template that has been submitted for review. ::

    aws ssm update-document-metadata \
        --name MyChangeManagerTemplate \
        --document-reviews 'Action=Approve,Comment=[{Type=Comment,Content=Approved!}]'

This command produces no output.

For more information, see `Reviewing and approving or rejecting change templates <https://docs.aws.amazon.com/systems-manager/latest/userguide/change-templates-review.html>`__ in the *AWS Systems Manager User Guide*.