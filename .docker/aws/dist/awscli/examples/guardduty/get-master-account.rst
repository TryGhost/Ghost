**To retrieve details about your master account in the current region**

The following ``get-master-account`` example displays the status and details of the master account associated with your detector in the current region. ::

    aws guardduty get-master-account \
        --detector-id 12abc34d567e8fa901bc2d34eexample  

Output::

    {
        "Master": {
            "InvitationId": "04b94d9704854a73f94e061e8example",
            "InvitedAt": "2020-06-09T22:23:04.970Z",
            "RelationshipStatus": "Enabled",
            "AccountId": "111122223333"
        }
    }

For more information, see `Understanding the relationship between GuardDuty administrator account and member account <https://docs.aws.amazon.com/guardduty/latest/ug/administrator_member_relationships.html>`__ in the *GuardDuty User Guide*.