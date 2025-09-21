**To disassociate an approval rule template from multiple repositories in a single operation**

The following ``batch-disassociate-approval-rule-template-from-repositories`` example disassociates the specified approval rule template from repositories named ``MyDemoRepo`` and ``MyOtherDemoRepo``. ::

    aws codecommit batch-disassociate-approval-rule-template-from-repositories \
        --repository-names MyDemoRepo, MyOtherDemoRepo  \
        --approval-rule-template-name 1-approval-rule-for-all pull requests

Output::

    {
        "disassociatedRepositoryNames": [
            "MyDemoRepo",
            "MyOtherDemoRepo"
        ],
        "errors": []
    }

For more information, see `Disassociate an Approval Rule Template <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-disassociate-template.html#batch-disassociate-template>`__ in the *AWS CodeCommit User Guide*.
