**To get a list of the reports for the current account in AWS CodeBuild.**

The following ``list-reports`` example retrieves the ARNs of the reports for the current account. ::

    aws codebuild list-reports

Output::

    {
        "reports": [
            "arn:aws:codebuild:<region-ID>:<user-ID>:report/<report-group-name>:<report ID>",
            "arn:aws:codebuild:<region-ID>:<user-ID>:report/<report-group-name>:<report ID>",
            "arn:aws:codebuild:<region-ID>:<user-ID>:report/<report-group-name>:<report ID>"
        ]
    }

For more information, see `Working with reports <https://docs.aws.amazon.com/codebuild/latest/userguide/test-report.html>`__ in the *AWS CodeBuild User Guide*.
