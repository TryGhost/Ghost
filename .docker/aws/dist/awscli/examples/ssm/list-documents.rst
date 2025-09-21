**Example 1: To list documents**

The following ``list-documents`` example lists documents owned by the requesting account tagged with the custom tag. ::

    aws ssm list-documents \
        --filters Key=Owner,Values=Self Key=tag:DocUse,Values=Testing

Output::

    {
        "DocumentIdentifiers": [
            {
                "Name": "Example",
                "Owner": "29884EXAMPLE",
                "PlatformTypes": [
                    "Windows",
                    "Linux"
                ],
                "DocumentVersion": "1",
                "DocumentType": "Automation",
                "SchemaVersion": "0.3",
                "DocumentFormat": "YAML",
                "Tags": [
                    {
                        "Key": "DocUse",
                        "Value": "Testing"
                    }
                ]
            }
        ]
    }

For more information, see `AWS Systems Manager Documents <https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-ssm-docs.html>`__ in the *AWS Systems Manager User Guide*.

**Example 2: To list shared documents**

The following ``list-documents`` example lists shared documents, including private shared documents not owned by AWS. ::

    aws ssm list-documents \
        --filters Key=Name,Values=sharedDocNamePrefix  Key=Owner,Values=Private

Output::

    {
        "DocumentIdentifiers": [
            {
                "Name": "Example",
                "Owner": "12345EXAMPLE",
                "PlatformTypes": [
                    "Windows",
                    "Linux"
                ],
                "DocumentVersion": "1",
                "DocumentType": "Command",
                "SchemaVersion": "0.3",
                "DocumentFormat": "YAML",
                "Tags": []
            }
        ]
    }

For more information, see `AWS Systems Manager Documents <https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-ssm-docs.html>`__ in the *AWS Systems Manager User Guide*.