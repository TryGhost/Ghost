**To view approvals on a pull request**

The following ``get-pull-request-approval-states`` example returns approvals for the specified pull request. ::

    aws codecommit get-pull-request-approval-states \
        --pull-request-id 8 \
        --revision-id 9f29d167EXAMPLE 

Output::

    {
        "approvals": [
            {
                "userArn": "arn:aws:iam::123456789012:user/Mary_Major",
                "approvalState": "APPROVE"
            }
        ]
    }

For more information, see `View Pull Requests <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-view-pull-request.html#get-pull-request-approval-state>`__ in the *AWS CodeCommit User Guide*.
