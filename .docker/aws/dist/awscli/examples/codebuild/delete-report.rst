**To delete a report in AWS CodeBuild.**

The following ``delete-report`` example deletes the specified report. ::

    aws codebuild delete-report \
        --arn arn:aws:codebuild:<region-ID>:<account-ID>:report/<report-group-name>:<report-ID>

This command produces no output.

For more information, see `Working with reports  <https://docs.aws.amazon.com/codebuild/latest/userguide/test-report.html>`__ in the *AWS CodeBuild User Guide*.