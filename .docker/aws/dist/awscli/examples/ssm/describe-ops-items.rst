**To list a set of OpsItems**

The following ``describe-ops-items`` example displays a list of all open OpsItems in your AWS account. ::

    aws ssm describe-ops-items \
        --ops-item-filters "Key=Status,Values=Open,Operator=Equal"

Output::

    {
        "OpsItemSummaries": [
            {
                "CreatedBy": "arn:aws:sts::111222333444:assumed-role/OpsItem-CWE-Role/fbf77cbe264a33509569f23e4EXAMPLE",
                "CreatedTime": "2020-03-14T17:02:46.375000-07:00",
                "LastModifiedBy": "arn:aws:sts::111222333444:assumed-role/OpsItem-CWE-Role/fbf77cbe264a33509569f23e4EXAMPLE",
                "LastModifiedTime": "2020-03-14T17:02:46.375000-07:00",
                "Source": "SSM",
                "Status": "Open",
                "OpsItemId": "oi-7cfc5EXAMPLE",
                "Title": "SSM Maintenance Window execution failed",
                "OperationalData": {
                    "/aws/dedup": {
                        "Value": "{\"dedupString\":\"SSMOpsItems-SSM-maintenance-window-execution-failed\"}",
                        "Type": "SearchableString"
                    },
                    "/aws/resources": {
                        "Value": "[{\"arn\":\"arn:aws:ssm:us-east-2:111222333444:maintenancewindow/mw-034093d322EXAMPLE\"}]",
                        "Type": "SearchableString"
                    }
                },
                "Category": "Availability",
                "Severity": "3"
            },
            {
                "CreatedBy": "arn:aws:sts::1112223233444:assumed-role/OpsItem-CWE-Role/fbf77cbe264a33509569f23e4EXAMPLE",
                "CreatedTime": "2020-02-26T11:43:15.426000-08:00",
                "LastModifiedBy": "arn:aws:sts::111222333444:assumed-role/OpsItem-CWE-Role/fbf77cbe264a33509569f23e4EXAMPLE",
                "LastModifiedTime": "2020-02-26T11:43:15.426000-08:00",
                "Source": "EC2",
                "Status": "Open",
                "OpsItemId": "oi-6f966EXAMPLE",
                "Title": "EC2 instance stopped",
                "OperationalData": {
                    "/aws/automations": {
                        "Value": "[ { \"automationType\": \"AWS:SSM:Automation\", \"automationId\": \"AWS-RestartEC2Instance\" } ]",
                        "Type": "SearchableString"
                    },
                    "/aws/dedup": {
                        "Value": "{\"dedupString\":\"SSMOpsItems-EC2-instance-stopped\"}",
                        "Type": "SearchableString"
                    },
                    "/aws/resources": {
                        "Value": "[{\"arn\":\"arn:aws:ec2:us-east-2:111222333444:instance/i-0beccfbc02EXAMPLE\"}]",
                        "Type": "SearchableString"
                    }
                },
                "Category": "Availability",
                "Severity": "3"
            }
        ]
    }

For more information, see `Working with OpsItems <https://docs.aws.amazon.com/systems-manager/latest/userguide/OpsCenter-working-with-OpsItems.html>`__ in the *AWS Systems Manager User Guide*.
