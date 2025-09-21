**To add a recommendation to a code review**

The following ``put-recommendation-feedback`` puts a ``ThumbsUp`` recommendation on a code review. ::

    aws codeguru-reviewer put-recommendation-feedback \
        --code-review-arn \arn:aws:codeguru-reviewer:us-west-2:123456789012:association:a1b2c3d4-5678-90ab-cdef-EXAMPLE11111:code-review:RepositoryAnalysis-my-repository-name-branch-abcdefgh12345678 \
        --recommendation-id 3be1b2e5d7ef6e298a06499379ee290c9c596cf688fdcadb08285ddb0dd390eb \
        --reactions ThumbsUp

This command produces no output.

For more information, see `Step 4: Provide feedback <https://docs.aws.amazon.com/codeguru/latest/reviewer-ug/provide-feedback.html>`__ in the *Amazon CodeGuru Reviewer User Guide*.
