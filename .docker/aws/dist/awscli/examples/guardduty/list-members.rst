**Example 1: To list only current members in the current Region**

The following ``list-members`` example lists and provides details of only current member accounts associated with the GuardDuty administrator account, in the current region. ::

    aws guardduty list-members \
        --detector-id 12abc34d567e8fa901bc2d34eexample \
        --only-associated="true" 

Output::

    {
        "Members": [
            {
                "RelationshipStatus": "Enabled",
                "InvitedAt": "2020-06-09T22:49:00.910Z",
                "MasterId": "111122223333",
                "DetectorId": "7ab8b2f61b256c87f793f6a86example",
                "UpdatedAt": "2020-06-09T23:08:22.512Z",
                "Email": "your+member@example.com",
                "AccountId": "123456789012"
            }
        ]
    }

For more information, see `Understanding the relationship between GuardDuty administrator account and member accounts <https://docs.aws.amazon.com/guardduty/latest/ug/administrator_member_relationships.html>`__ in the *GuardDuty User Guide*.

**Example 2: To list all the members in the current Region**

The following ``list-members`` example lists and provides details of all the member accounts, including those who have been disassociated or have not yet accepted the invite from the GuardDuty administrator, in the current region. ::

    aws guardduty list-members \
        --detector-id 12abc34d567e8fa901bc2d34eexample \
        --only-associated="false"

Output::

    {
        "Members": [
            {
                "RelationshipStatus": "Enabled",
                "InvitedAt": "2020-06-09T22:49:00.910Z",
                "MasterId": "111122223333",
                "DetectorId": "7ab8b2f61b256c87f793f6a86example",
                "UpdatedAt": "2020-06-09T23:08:22.512Z",
                "Email": "your+other+member@example.com",
                "AccountId": "555555555555"
            }
        ]
    }

For more information, see `Understanding the relationship between GuardDuty administrator account and member accounts <https://docs.aws.amazon.com/guardduty/latest/ug/administrator_member_relationships.html>`__ in the *GuardDuty User Guide*.
