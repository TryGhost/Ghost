**To get a list of the shared report group ARNs in AWS CodeBuild.**

The following ``list-shared-report-groups`` example retrieves the report group ARNs for the account in the region. ::

    aws codebuild list-shared-report-groups

Output::

    {
        "reportGroups": [
            "arn:aws:codebuild:<region-ID>:<user-ID>:report-group/report-group-1",
            "arn:aws:codebuild:<region-ID>:<user-ID>:report-group/report-group-2",
            "arn:aws:codebuild:<region-ID>:<user-ID>:report-group/report-group-3"
        ]
    }

For more information, see `Working with report groups  <https://docs.aws.amazon.com/codebuild/latest/userguide/test-report-group.html>`__ in the *AWS CodeBuild User Guide*.
