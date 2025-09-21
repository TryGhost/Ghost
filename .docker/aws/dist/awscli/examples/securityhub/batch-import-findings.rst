**To update a finding**

The following ``batch-import-findings`` example updates a finding. ::

    aws securityhub batch-import-findings \
         --findings '
            [{
                "AwsAccountId": "123456789012",
                "CreatedAt": "2020-05-27T17:05:54.832Z",
                "Description": "Vulnerability in a CloudTrail trail",
                "FindingProviderFields": {
                    "Severity": {
                        "Label": "LOW",
                        "Original": "10"
                    },
                    "Types": [
                        "Software and Configuration Checks/Vulnerabilities/CVE"
                    ]
                },
                "GeneratorId": "TestGeneratorId",
                "Id": "Id1",
                "ProductArn": "arn:aws:securityhub:us-west-1:123456789012:product/123456789012/default",
                "Resources": [
                    {
                        "Id": "arn:aws:cloudtrail:us-west-1:123456789012:trail/TrailName",
                        "Partition": "aws",
                        "Region": "us-west-1",
                        "Type": "AwsCloudTrailTrail"
                    }
                ],
                "SchemaVersion": "2018-10-08",
                "Title": "CloudTrail trail vulnerability",
                "UpdatedAt": "2020-06-02T16:05:54.832Z"
            }]'

Output::

    {
        "FailedCount": 0,
        "SuccessCount": 1,
        "FailedFindings": []
    }

For more information, see `Using BatchImportFindings to create and update findings <https://docs.aws.amazon.com/securityhub/latest/userguide/finding-update-batchimportfindings.html>`__ in the *AWS Security Hub User Guide*.