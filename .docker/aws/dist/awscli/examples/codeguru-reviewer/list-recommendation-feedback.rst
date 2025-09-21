**To list customer recommendation feedback for a recommendation on an associated repository**

The following ``list-recommendation-feedback`` Lists customer feedback on all recommendations on a code review. This code review has one piece of feedback, a "ThumbsUp", from a customer. ::

    aws codeguru-reviewer list-recommendation-feedback \
        --code-review-arn arn:aws:codeguru-reviewer:us-west-2:123456789012:association:a1b2c3d4-5678-90ab-cdef-EXAMPLE11111:code-review:RepositoryAnalysis-my-repository-name-branch-abcdefgh12345678

Output::

    {
        "RecommendationFeedbackSummaries": [
            {
                "RecommendationId": "3be1b2e5d7ef6e298a06499379ee290c9c596cf688fdcadb08285ddb0dd390eb",
                "Reactions": [
                    "ThumbsUp"
                ],
                "UserId": "aws-user-id"
            }
        ]
    }

For more information, see `Step 4: Provide feedback <https://docs.aws.amazon.com/codeguru/latest/reviewer-ug/provide-feedback.html>`__ in the *Amazon CodeGuru Reviewer User Guide*.