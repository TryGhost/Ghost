**To disassociate an approval rule template from a repository**

The following ``disassociate-approval-rule-template-from-repository`` example disassociates the specified approval rule template from a repository named ``MyDemoRepo``. ::

    aws codecommit disassociate-approval-rule-template-from-repository \
        --repository-name MyDemoRepo  \
        --approval-rule-template-name 1-approver-rule-for-all-pull-requests

This command produces no output.

For more information, see `Disassociate an Approval Rule Template <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-disassociate-template.html#disassociate-template>`__ in the *AWS CodeCommit User Guide*.
