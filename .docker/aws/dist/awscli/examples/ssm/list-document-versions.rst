**To list document versions**

The following ``list-document-versions`` example lists all versions for a Systems Manager document. ::

    aws ssm list-document-versions \
        --name "Example"

Output::

    {
        "DocumentVersions": [
            {
                "Name": "Example",
                "DocumentVersion": "1",
                "CreatedDate": 1583257938.266,
                "IsDefaultVersion": true,
                "DocumentFormat": "YAML",
                "Status": "Active"
            }
        ]
    }  

For more information, see `Sending Commands that Use the Document Version Parameter <https://docs.aws.amazon.com/systems-manager/latest/userguide/run-command-version.html>`__ in the *AWS Systems Manager User Guide*.
