**To view information about an OpsItem**

The following ``get-ops-item`` example displays details about the specified OpsItem. ::

    aws ssm get-ops-item \
        --ops-item-id oi-0b725EXAMPLE

Output::

    {
        "OpsItem": {
            "CreatedBy": "arn:aws:sts::111222333444:assumed-role/OpsItem-CWE-Role/fbf77cbe264a33509569f23e4EXAMPLE",
            "CreatedTime": "2019-12-04T15:52:16.793000-08:00",
            "Description": "CloudWatch Event Rule SSMOpsItems-EC2-instance-terminated was triggered. Your EC2 instance has terminated. See below for more details.",
            "LastModifiedBy": "arn:aws:sts::111222333444:assumed-role/OpsItem-CWE-Role/fbf77cbe264a33509569f23e4EXAMPLE",
            "LastModifiedTime": "2019-12-04T15:52:16.793000-08:00",
            "Notifications": [],
            "RelatedOpsItems": [],
            "Status": "Open",
            "OpsItemId": "oi-0b725EXAMPLE",
            "Title": "EC2 instance terminated",
            "Source": "EC2",
            "OperationalData": {
                "/aws/automations": {
                    "Value": "[ { \"automationType\": \"AWS:SSM:Automation\", \"automationId\": \"AWS-CreateManagedWindowsInstance\" }, { \"automationType\": \"AWS:SSM:Automation\", \"automationId\": \"AWS-CreateManagedLinuxInstance\" } ]",
                    "Type": "SearchableString"
                },
                "/aws/dedup": {
                    "Value": "{\"dedupString\":\"SSMOpsItems-EC2-instance-terminated\"}",
                    "Type": "SearchableString"
                },
                "/aws/resources": {
                    "Value": "[{\"arn\":\"arn:aws:ec2:us-east-2:111222333444:instance/i-05adec7e97EXAMPLE\"}]",
                    "Type": "SearchableString"
                },
                "event-time": {
                    "Value": "2019-12-04T23:52:16Z",
                    "Type": "String"
                },
                "instance-state": {
                    "Value": "terminated",
                    "Type": "String"
                }
            },
            "Category": "Availability",
            "Severity": "4"
        }
    }

For more information, see `Working with OpsItems <https://docs.aws.amazon.com/systems-manager/latest/userguide/OpsCenter-working-with-OpsItems.html>`__ in the *AWS Systems Manager User Guide*.
