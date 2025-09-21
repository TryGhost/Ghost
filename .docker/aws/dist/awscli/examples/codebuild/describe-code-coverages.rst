**To get detailed information about code coverage test results in AWS CodeBuild.**

The following ``describe-code-coverages`` example gets information about the code coverage test results in the specified report. ::

    aws codebuild describe-code-coverages \
        --report-arn arn:aws:codebuild:<region-ID>:<account-ID>:report/<report-group-name>:<report-ID>

Output::

    {
        "codeCoverages": [
            {
                "id": "20a0adcc-db13-4b66-804b-ecaf9f852855",
                "reportARN": "arn:aws:codebuild:<region-ID>:972506530580:report/<report-group-name>:<report-ID>",
                "filePath": "<source-file-1-path>",
                "lineCoveragePercentage": 83.33,
                "linesCovered": 5,
                "linesMissed": 1,
                "branchCoveragePercentage": 50.0,
                "branchesCovered": 1,
                "branchesMissed": 1,
                "expired": "2020-11-20T21:22:45+00:00"
            },
            {
                "id": "0887162d-bf57-4cf1-a164-e432373d1a83",
                "reportARN": "arn:aws:codebuild:<region-ID>:972506530580:report/<report-group-name>:<report-ID>",
                "filePath": "<source-file-2-path>",
                "lineCoveragePercentage": 90.9,
                "linesCovered": 10,
                "linesMissed": 1,
                "branchCoveragePercentage": 50.0,
                "branchesCovered": 1,
                "branchesMissed": 1,
                "expired": "2020-11-20T21:22:45+00:00"
            }
        ]
    }

For more information, see `Code coverage reports <https://docs.aws.amazon.com/codebuild/latest/userguide/code-coverage-report.html>`__ in the *AWS CodeBuild User Guide*.