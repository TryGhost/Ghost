**To list code reviews created in your AWS account in the last 90 days.**

The following ``list-code-reviews`` example lists the code reviews created in the last 90 days using pull requests. ::

    aws codeguru-reviewer list-code-reviews \
        --type PullRequest

Output::

    {
        "CodeReviewSummaries": [
            {
                "LastUpdatedTimeStamp": 1588897288.054,
                "Name": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "ProviderType": "GitHub",
                "PullRequestId": "5",
                "MetricsSummary": {
                    "MeteredLinesOfCodeCount": 24,
                    "FindingsCount": 1
                },
                "CreatedTimeStamp": 1588897068.512,
                "State": "Completed",
                "CodeReviewArn": "arn:aws:codeguru-reviewer:us-west-2:123456789012:code-review:a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "Owner": "sample-owner",
                "RepositoryName": "sample-repository-name",
                "Type": "PullRequest"
            },
            {
                "LastUpdatedTimeStamp": 1588869793.263,
                "Name": "a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "ProviderType": "GitHub",
                "PullRequestId": "4",
                "MetricsSummary": {
                    "MeteredLinesOfCodeCount": 29,
                    "FindingsCount": 0
                },
                "CreatedTimeStamp": 1588869575.949,
                "State": "Completed",
                "CodeReviewArn": "arn:aws:codeguru-reviewer:us-west-2:123456789012:code-review:a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "Owner": "sample-owner",
                "RepositoryName": "sample-repository-name",
                "Type": "PullRequest"
            },
            {
                "LastUpdatedTimeStamp": 1588870511.211,
                "Name": "a1b2c3d4-5678-90ab-cdef-EXAMPLE33333",
                "ProviderType": "GitHub",
                "PullRequestId": "4",
                "MetricsSummary": {
                    "MeteredLinesOfCodeCount": 2,
                    "FindingsCount": 0
                },
                "CreatedTimeStamp": 1588870292.425,
                "State": "Completed",
                "CodeReviewArn": "arn:aws:codeguru-reviewer:us-west-2:123456789012:code-review:a1b2c3d4-5678-90ab-cdef-EXAMPLE33333",
                "Owner": "sample-owner",
                "RepositoryName": "sample-repository-name",
                "Type": "PullRequest"
            },
            {
                "LastUpdatedTimeStamp": 1588118522.452,
                "Name": "a1b2c3d4-5678-90ab-cdef-EXAMPLE44444",
                "ProviderType": "GitHub",
                "PullRequestId": "3",
                "MetricsSummary": {
                    "MeteredLinesOfCodeCount": 29,
                    "FindingsCount": 0
                },
                "CreatedTimeStamp": 1588118301.131,
                "State": "Completed",
                "CodeReviewArn": "arn:aws:codeguru-reviewer:us-west-2:123456789012:code-review:a1b2c3d4-5678-90ab-cdef-EXAMPLE44444",
                "Owner": "sample-owner",
                "RepositoryName": "sample-repository-name",
                "Type": "PullRequest"
            },
            {
                "LastUpdatedTimeStamp": 1588112205.207,
                "Name": "a1b2c3d4-5678-90ab-cdef-EXAMPLE55555",
                "ProviderType": "GitHub",
                "PullRequestId": "2",
                "MetricsSummary": {
                    "MeteredLinesOfCodeCount": 25,
                    "FindingsCount": 0
                },
                "CreatedTimeStamp": 1588111987.443,
                "State": "Completed",
                "CodeReviewArn": "arn:aws:codeguru-reviewer:us-west-2:123456789012:code-review:a1b2c3d4-5678-90ab-cdef-EXAMPLE55555",
                "Owner": "sample-owner",
                "RepositoryName": "sample-repository-name",
                "Type": "PullRequest"
            },
            {
                "LastUpdatedTimeStamp": 1588104489.981,
                "Name": "a1b2c3d4-5678-90ab-cdef-EXAMPLE66666",
                "ProviderType": "GitHub",
                "PullRequestId": "1",
                "MetricsSummary": {
                    "MeteredLinesOfCodeCount": 25,
                    "FindingsCount": 0
                },
                "CreatedTimeStamp": 1588104270.223,
                "State": "Completed",
                "CodeReviewArn": "arn:aws:codeguru-reviewer:us-west-2:123456789012:code-review:a1b2c3d4-5678-90ab-cdef-EXAMPLE66666",
                "Owner": "sample-owner",
                "RepositoryName": "sample-repository-name",
                "Type": "PullRequest"
            }
        ]
    }

For more information, see `View all code reviews <https://docs.aws.amazon.com/codeguru/latest/reviewer-ug/view-all-code-reviews.html>`__ in the *Amazon CodeGuru Reviewer User Guide*.
