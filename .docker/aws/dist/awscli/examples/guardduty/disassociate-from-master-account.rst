**To disassociate from your current administrator account in the current region**

The following ``disassociate-from-master-account`` example dissassociates your account from the current GuardDuty administrator account in the current AWS region. ::

    aws guardduty disassociate-from-master-account \
        --detector-id d4b040365221be2b54a6264dcexample 

This command produces no output.

For more information, see `Understanding the relationship between GuardDuty administrator account and member accounts <https://docs.aws.amazon.com/guardduty/latest/ug/administrator_member_relationships.html>`__ in the *GuardDuty User Guide*.
