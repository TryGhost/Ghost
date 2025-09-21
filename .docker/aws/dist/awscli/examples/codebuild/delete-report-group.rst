**To delete a report groups in AWS CodeBuild.**

The following ``delete-report-group`` example deletes the report group with the specified ARN. ::

    aws codebuild delete-report-group \
        --arn arn:aws:codebuild:<region-ID>:<user-ID>:report-group/<report-group-name>

This command produces no output.

For more information, see `Working with report groups  <https://docs.aws.amazon.com/codebuild/latest/userguide/test-report-group.html>`__ in the *AWS CodeBuild User Guide*.
