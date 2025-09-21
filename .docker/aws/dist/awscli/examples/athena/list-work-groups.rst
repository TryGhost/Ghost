**To list workgroups**

The following ``list-work-groups`` example lists the workgroups in the current account. ::

    aws athena list-work-groups

Output::

    {
        "WorkGroups": [
            {
                "Name": "Data_Analyst_Group",
                "State": "ENABLED",
                "Description": "",
                "CreationTime": 1578006683.016
            },
            {
                "Name": "AthenaAdmin",
                "State": "ENABLED",
                "Description": "",
                "CreationTime": 1573677174.105
            },
            {
                "Name": "primary",
                "State": "ENABLED",
                "Description": "",
                "CreationTime": 1567465222.723
            }
        ]
    }

For more information, see `Managing Workgroups <https://docs.aws.amazon.com/athena/latest/ug/workgroups-create-update-delete.html>`__ in the *Amazon Athena User Guide*.