**To associate an approval rule template with a repository**

The following ``associate-approval-rule-template-with-repository`` example associates the specified approval rule template with a repository named ``MyDemoRepo``. ::

    aws codecommit associate-approval-rule-template-with-repository \
        --repository-name MyDemoRepo  \
        --approval-rule-template-name 2-approver-rule-for-main

This command produces no output.

For more information, see `Associate an Approval Rule Template with a Repository <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-associate-template.html#associate-template-repository>`__ in the *AWS CodeCommit User Guide*.
