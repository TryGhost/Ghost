**To view a summary of all OpsItems**

The following ``get-ops-summary`` example displays a summary of all OpsItems in your AWS account. ::

    aws ssm get-ops-summary

Output::

    {
        "Entities": [
            {
                "Id": "oi-4309fEXAMPLE",
                "Data": {
                    "AWS:OpsItem": {
                        "CaptureTime": "2020-02-26T18:58:32.918Z",
                        "Content": [
                            {
                                "AccountId": "111222333444",
                                "Category": "Availability",
                                "CreatedBy": "arn:aws:sts::111222333444:assumed-role/OpsItem-CWE-Role/fbf77cbe264a33509569f23e4EXAMPLE",
                                "CreatedTime": "2020-02-26T19:10:44.149Z",
                                "Description": "CloudWatch Event Rule SSMOpsItems-EC2-instance-terminated was triggered. Your EC2 instance has terminated. See below for more details.",
                                "LastModifiedBy": "arn:aws:sts::111222333444:assumed-role/OpsItem-CWE-Role/fbf77cbe264a33509569f23e4EXAMPLE",
                                "LastModifiedTime": "2020-02-26T19:10:44.149Z",
                                "Notifications": "",
                                "OperationalData": "{\"/aws/automations\":{\"type\":\"SearchableString\",\"value\":\"[ { \\\"automationType\\\": \\\"AWS:SSM:Automation\\\", \\\"automationId\\\": \\\"AWS-CreateManagedWindowsInstance\\\" }, { \\\"automationType\\\": \\\"AWS:SSM:Automation\\\", \\\"automationId\\\": \\\"AWS-CreateManagedLinuxInstance\\\" } ]\"},\"/aws/resources\":{\"type\":\"SearchableString\",\"value\":\"[{\\\"arn\\\":\\\"arn:aws:ec2:us-east-2:111222333444:instance/i-0acbd0800fEXAMPLE\\\"}]\"},\"/aws/dedup\":{\"type\":\"SearchableString\",\"value\":\"{\\\"dedupString\\\":\\\"SSMOpsItems-EC2-instance-terminated\\\"}\"}}",
                                "OpsItemId": "oi-4309fEXAMPLE",
                                "RelatedItems": "",
                                "Severity": "3",
                                "Source": "EC2",
                                "Status": "Open",
                                "Title": "EC2 instance terminated"
                            }
                        ]
                    }
                }
            },
            {
                "Id": "oi-bb2a0e6a4541",
                "Data": {
                    "AWS:OpsItem": {
                        "CaptureTime": "2019-11-26T19:20:06.161Z",
                        "Content": [
                            {
                                "AccountId": "111222333444",
                                "Category": "Availability",
                                "CreatedBy": "arn:aws:sts::111222333444:assumed-role/OpsItem-CWE-Role/fbf77cbe264a33509569f23e4EXAMPLE",
                                "CreatedTime": "2019-11-26T20:00:07.237Z",
                                "Description": "CloudWatch Event Rule SSMOpsItems-SSM-maintenance-window-execution-failed was triggered. Your SSM Maintenance Window execution has failed. See below for more details.",
                                "LastModifiedBy": "arn:aws:sts::111222333444:assumed-role/OpsItem-CWE-Role/fbf77cbe264a33509569f23e4EXAMPLE",
                                "LastModifiedTime": "2019-11-26T20:00:07.237Z",
                                "Notifications": "",
                                "OperationalData": "{\"/aws/resources\":{\"type\":\"SearchableString\",\"value\":\"[{\\\"arn\\\":\\\"arn:aws:ssm:us-east-2:111222333444:maintenancewindow/mw-0e83ba440dEXAMPLE\\\"}]\"},\"/aws/dedup\":{\"type\":\"SearchableString\",\"value\":\"{\\\"dedupString\\\":\\\"SSMOpsItems-SSM-maintenance-window-execution-failed\\\"}\"}}",
                                "OpsItemId": "oi-bb2a0EXAMPLE",
                                "RelatedItems": "",
                                "Severity": "3",
                                "Source": "SSM",
                                "Status": "Open",
                                "Title": "SSM Maintenance Window execution failed"
                            }
                        ]
                    }
                }
            }
        ]
    }

For more information, see `Working with OpsItems <https://docs.aws.amazon.com/systems-manager/latest/userguide/OpsCenter-working-with-OpsItems.html>`__ in the *AWS Systems Manager User Guide*.
