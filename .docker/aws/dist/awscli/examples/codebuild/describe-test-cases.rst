**To get detailed information about test cases in AWS CodeBuild.**

The following ``describe-test-cases`` example gets information about the test cases in the specified report. ::

    aws codebuild describe-test-cases \
        --report-arn arn:aws:codebuild:<region-ID>:<account-ID>:report/<report-group-name>:<report-ID>

Output::

    {
        "testCases": [
            {
                "reportArn": "arn:aws:codebuild:<region-ID>:<account-ID>:report/<report-group-name>:<report-ID>",
                "testRawDataPath": "<test-report-path>",
                "prefix": "NUnit.Tests.Assemblies.MockTestFixture",
                "name": "NUnit.Tests.Assemblies.MockTestFixture.NotRunnableTest",
                "status": "ERROR",
                "durationInNanoSeconds": 0,
                "message": "No arguments were provided\n",
                "expired": "2020-11-20T17:52:10+00:00"
            },
            {
                "reportArn": "arn:aws:codebuild:<region-ID>:<account-ID>:report/<report-group-name>:<report-ID>",
                "testRawDataPath": "<test-report-path>",
                "prefix": "NUnit.Tests.Assemblies.MockTestFixture",
                "name": "NUnit.Tests.Assemblies.MockTestFixture.TestWithException",
                "status": "ERROR",
                "durationInNanoSeconds": 0,
                "message": "System.ApplicationException : Intentional Exception\nat NUnit.Tests.Assemblies.MockTestFixture.MethodThrowsException()\nat NUnit.Tests.Assemblies.MockTestFixture.TestWithException()\n\n",
                "expired": "2020-11-20T17:52:10+00:00"
            }
        ]
    }

For more information, see `Working with test reporting in AWS CodeBuild <https://docs.aws.amazon.com/codebuild/latest/userguide/test-reporting.html>`__ in the *AWS CodeBuild User Guide*.