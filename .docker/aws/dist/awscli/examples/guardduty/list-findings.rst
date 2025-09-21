**Example 1: To list all findings for the current region**

The following ``list-findings`` example displays a list of all findingIds for the current region sorted by severity from highest to lowest. ::

    aws guardduty list-findings \
        --detector-id 12abc34d567e8fa901bc2d34eexample \ 
        --sort-criteria '{"AttributeName": "severity","OrderBy":"DESC"}'

Output::
    
    {
        "FindingIds": [
            "04b8ab50fd29c64fc771b232dexample",
            "5ab8ab50fd21373735c826d3aexample",
            "90b93de7aba69107f05bbe60bexample",
            ...
        ]
    }

For more information, see `Findings <https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings.html>`__ in the GuardDuty User Guide.

**Example 2: To list findings for the current region matching a specific finding criteria**

The following ``list-findings`` example displays a list of all findingIds that match a specified finding type. ::

    aws guardduty list-findings \
        --detector-id 12abc34d567e8fa901bc2d34eexample \ 
        --finding-criteria  '{"Criterion":{"type": {"Eq":["UnauthorizedAccess:EC2/SSHBruteForce"]}}}'

Output::
    
    {
        "FindingIds": [
            "90b93de7aba69107f05bbe60bexample",
            "6eb9430d7023d30774d6f05e3example",
            "2eb91a2d060ac9a21963a5848example",
            "44b8ab50fd2b0039a9e48f570example",
            "9eb8ab4cd2b7e5b66ba4f5e96example",
            "e0b8ab3a38e9b0312cc390ceeexample"
        ]
    }

For more information, see `Findings <https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings.html>`__ in the GuardDuty User Guide.

**Example 3: To list findings for the current region matching a specific set of finding criteria defined within a JSON file**

The following ``list-findings`` example displays a list of all findingIds that are not archived, and involve the IAM user named "testuser", as specified in a JSON file. ::

    aws guardduty list-findings \
        --detector-id 12abc34d567e8fa901bc2d34eexample \ 
        --finding-criteria  file://myfile.json

Contents of ``myfile.json``::

    {"Criterion": {
        "resource.accessKeyDetails.userName":{
                    "Eq":[
                        "testuser"
                        ]
                    },
        "service.archived": {
                    "Eq": [
                        "false"
                    ]
                }
            }
    }

Output::
    
    {
        "FindingIds": [
            "1ab92989eaf0e742df4a014d5example"
        ]
    }

For more information, see `Findings <https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings.html>`__ in the GuardDuty User Guide.