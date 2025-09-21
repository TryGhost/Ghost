**To display details of a document**

The following ``describe-document`` example displays details about a Systems Manager document in your AWS account. ::

    aws ssm describe-document \
        --name "Example"

Output::

    {
        "Document": {
            "Hash": "fc2410281f40779e694a8b95975d0f9f316da8a153daa94e3d9921102EXAMPLE",
            "HashType": "Sha256",
            "Name": "Example",
            "Owner": "29884EXAMPLE",
            "CreatedDate": 1583257938.266,
            "Status": "Active",
            "DocumentVersion": "1",
            "Description": "Document Example",
            "Parameters": [
                {
                    "Name": "AutomationAssumeRole",
                    "Type": "String",
                    "Description": "(Required) The ARN of the role that allows Automation to perform the actions on your behalf. If no role is specified, Systems Manager Automation uses your IAM permissions to execute this document.",
                    "DefaultValue": ""
                },
                {
                    "Name": "InstanceId",
                    "Type": "String",
                    "Description": "(Required) The ID of the Amazon EC2 instance.",
                    "DefaultValue": ""
                }
            ],
            "PlatformTypes": [
                "Windows",
                "Linux"
            ],
            "DocumentType": "Automation",
            "SchemaVersion": "0.3",
            "LatestVersion": "1",
            "DefaultVersion": "1",
            "DocumentFormat": "YAML",
            "Tags": []
        }
    }

For more information, see `Creating Systems Manager Documents <https://docs.aws.amazon.com/systems-manager/latest/userguide/create-ssm-doc.html>`__ in the *AWS Systems Manager User Guide*.
