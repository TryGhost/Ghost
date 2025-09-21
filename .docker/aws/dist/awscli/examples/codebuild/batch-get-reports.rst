**To get information about one or more reports in AWS CodeBuild.**

The following ``batch-get-reports`` example retrieves information about the reports with the specified ARNs. ::

    aws codebuild batch-get-reports \
        --report-arns arn:aws:codebuild:<region-ID>:<user-ID>:report/<report-group-name>:<report 1 ID> arn:aws:codebuild:<region-ID>:<user-ID>:report/<report-group-name>:<report 2 ID>

Output::

    {
        "reports": [
            {
                "arn": "arn:aws:codebuild:<region-ID>:<user-ID>:report/<report-group-name>:<report 1 ID>",
                "type": "TEST",
                "name": "<report-group-name>",
                "reportGroupArn": "arn:aws:codebuild:<region-ID>:<user-ID>:report-group/<report-group-name>",
                "executionId": "arn:aws:codebuild:<region-ID>:<user-ID>:build/test-reports:<ID>",
                "status": "FAILED",
                "created": "2020-10-01T11:25:22.531000-07:00",
                "expired": "2020-10-31T11:25:22-07:00",
                "exportConfig": {
                    "exportConfigType": "NO_EXPORT"
                },
                "truncated": false,
                "testSummary": {
                    "total": 28,
                    "statusCounts": {
                        "ERROR": 5,
                        "FAILED": 1,
                        "SKIPPED": 4,
                        "SUCCEEDED": 18,
                        "UNKNOWN": 0
                    },
                    "durationInNanoSeconds": 94000000
                }
            },
            {
                "arn": "arn:aws:codebuild:<region-ID>:<user-ID>:report/<report-group-name>:<report 2 ID>",
                "type": "TEST",
                "name": "<report-group-name>",
                "reportGroupArn": "arn:aws:codebuild:<region-ID>:<user-ID>:report-group/<report-group-name>",
                "executionId": "arn:aws:codebuild:<region-ID>:<user-ID>:build/test-reports:<ID>",
                "status": "FAILED",
                "created": "2020-10-01T11:13:05.816000-07:00",
                "expired": "2020-10-31T11:13:05-07:00",
                "exportConfig": {
                    "exportConfigType": "NO_EXPORT"
                },
                "truncated": false,
                "testSummary": {
                    "total": 28,
                    "statusCounts": {
                        "ERROR": 5,
                        "FAILED": 1,
                        "SKIPPED": 4,
                        "SUCCEEDED": 18,
                        "UNKNOWN": 0
                    },
                    "durationInNanoSeconds": 94000000
                }
            }
        ],
        "reportsNotFound": []
    }

For more information, see `Working with reports <https://docs.aws.amazon.com/codebuild/latest/userguide/test-report.html>`__ in the *AWS CodeBuild User Guide*.

