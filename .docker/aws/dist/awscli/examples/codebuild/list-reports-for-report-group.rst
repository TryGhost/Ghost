**To get a list of the reports in a report group in AWS CodeBuild.**

The following ``list-report-for-report-groups`` example retrieves the reports in the specified report group for the account in the region. ::

    aws codebuild list-reports-for-report-group \
        --report-group-arn arn:aws:codebuild:<region-ID>:<user-ID>:report-group/<report-group-name>

Output::

    {
        "reports": [
            "arn:aws:codebuild:<region-ID>:<user-ID>:report/report-1",
            "arn:aws:codebuild:<region-ID>:<user-ID>:report/report-2",
            "arn:aws:codebuild:<region-ID>:<user-ID>:report/report-3"
        ]
    }

For more information, see `Working with report groups  <https://docs.aws.amazon.com/codebuild/latest/userguide/test-report-group.html>`__ in the *AWS CodeBuild User Guide*.
