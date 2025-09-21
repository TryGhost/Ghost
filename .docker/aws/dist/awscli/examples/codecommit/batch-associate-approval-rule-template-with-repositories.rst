**To associate an approval rule template with multiple repositories in a single operation**

The following ``batch-associate-approval-rule-template-with-repositories`` example associates the specified approval rule template with  repositories named ``MyDemoRepo`` and ``MyOtherDemoRepo``. 

Note: Approval rule templates are specific to the AWS Region where they are created. They can only be associated with repositories in that AWS Region. ::

    aws codecommit batch-associate-approval-rule-template-with-repositories \
        --repository-names MyDemoRepo, MyOtherDemoRepo  \
        --approval-rule-template-name 2-approver-rule-for-main

Output::

    {
        "associatedRepositoryNames": [
            "MyDemoRepo",
            "MyOtherDemoRepo"
        ],
        "errors": []
    }

For more information, see `Associate an Approval Rule Template with a Repository <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-associate-template.html#batch-associate-template-repositories>`__ in the *AWS CodeCommit User Guide*.
