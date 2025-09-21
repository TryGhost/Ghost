**To evaluate whether a pull request has all of its approval rules satisfied**

The following ``evaluate-pull-request-approval-rules`` example evaluates the state of approval rules on the specified pull request. In this example, an approval rule has not been satisfied for the pull request, so the output of the command shows an ``approved`` value of ``false``. ::

    aws codecommit evaluate-pull-request-approval-rules \
        --pull-request-id 27  \
        --revision-id 9f29d167EXAMPLE

Output::

    {
        "evaluation": {
            "approved": false,
            "approvalRulesNotSatisfied": [
                "Require two approved approvers"
            ],
            "overridden": false,
            "approvalRulesSatisfied": []
        }
    }



For more information, see `Merge a Pull Request <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-merge-pull-request.html#evaluate-pull-request-approval-rules>`__ in the *AWS CodeCommit User Guide*.
