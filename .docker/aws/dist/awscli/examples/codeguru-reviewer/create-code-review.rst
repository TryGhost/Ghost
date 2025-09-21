**To create a code review.**

The following ``create-code-review`` creates a review of code in the ``mainline`` branch of an AWS CodeCommit repository that is named ``my-repository-name``. ::

    aws codeguru-reviewer create-code-review \
        --name my-code-review \
        --repository-association-arn arn:aws:codeguru-reviewer:us-west-2:123456789012:association:a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 \
        --type '{"RepositoryAnalysis": {"RepositoryHead": {"BranchName": "mainline"}}}'

Output::

    {
        "CodeReview": {
            "Name": "my-code-review",
            "CodeReviewArn": "arn:aws:codeguru-reviewer:us-west-2:123456789012:association:a1b2c3d4-5678-90ab-cdef-EXAMPLE22222:code-review:RepositoryAnalysis-my-code-review",
            "RepositoryName": "my-repository-name",
            "Owner": "123456789012",
            "ProviderType": "CodeCommit",
            "State": "Pending",
            "StateReason": "CodeGuru Reviewer has received the request, and a code review is scheduled.",
            "CreatedTimeStamp": 1618873489.195,
            "LastUpdatedTimeStamp": 1618873489.195,
            "Type": "RepositoryAnalysis",
            "SourceCodeType": {
                "RepositoryHead": {
                    "BranchName": "mainline"
                }
            },
            "AssociationArn": "arn:aws:codeguru-reviewer:us-west-2:123456789012:association:a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
        }
    }

For more information, see `Create code reviews in Amazon CodeGuru Reviewer <https://docs.aws.amazon.com/codeguru/latest/reviewer-ug/create-code-reviews.html>`__ in the *Amazon CodeGuru Reviewer User Guide*.
