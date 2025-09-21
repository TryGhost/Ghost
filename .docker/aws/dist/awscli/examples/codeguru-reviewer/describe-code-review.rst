**List details about a code review.**

The following ``describe-code-review`` lists information about a review of code in the "mainline" branch of an AWS CodeCommit repository that is named "my-repo-name". ::

    aws codeguru-reviewer put-recommendation-feedback \
        --code-review-arn arn:aws:codeguru-reviewer:us-west-2:123456789012:association:a1b2c3d4-5678-90ab-cdef-EXAMPLE11111:code-review:RepositoryAnalysis-my-repository-name-branch-abcdefgh12345678 \ 
        --recommendation-id 3be1b2e5d7ef6e298a06499379ee290c9c596cf688fdcadb08285ddb0dd390eb \ 
        --reactions ThumbsUp

Output ::

    {
            "CodeReview": {
                "Name": "My-ecs-beta-repo-master-xs6di4kfd4j269dz",
                "CodeReviewArn": "arn:aws:codeguru-reviewer:us-west-2:123456789012:association:a1b2c3d4-5678-90ab-cdef-EXAMPLE22222:code-review:RepositoryAnalysis-my-repo-name",
                "RepositoryName": "My-ecs-beta-repo",
                "Owner": "123456789012",
                "ProviderType": "CodeCommit",
                "State": "Pending",
                "StateReason": "CodeGuru Reviewer is reviewing the source code.",
                "CreatedTimeStamp": 1618874226.226,
                "LastUpdatedTimeStamp": 1618874233.689,
                "Type": "RepositoryAnalysis",
                "SourceCodeType": {
                    "RepositoryHead": {
                        "BranchName": "mainline"
                    }
                },
                "AssociationArn": "arn:aws:codeguru-reviewer:us-west-2:123456789012:association:a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
            }
        }

For more information, see `View code review details <https://docs.aws.amazon.com/codeguru/latest/reviewer-ug/view-code-review-details.html>`__ in the *Amazon CodeGuru Reviewer User Guide*.
