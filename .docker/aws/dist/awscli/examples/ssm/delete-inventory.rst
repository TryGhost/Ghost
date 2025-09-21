**To delete a custom inventory type**

This example deletes a custom inventory schema.

Command::

  aws ssm delete-inventory --type-name "Custom:RackInfo" --schema-delete-option "DeleteSchema"

Output::

  {
    "DeletionId": "d72ac9e8-1f60-4d40-b1c6-bf8c78c68c4d",
    "TypeName": "Custom:RackInfo",
    "DeletionSummary": {
        "TotalCount": 1,
        "RemainingCount": 1,
        "SummaryItems": [
            {
                "Version": "1.0",
                "Count": 1,
                "RemainingCount": 1
            }
        ]
    }
  }

**To disable a custom inventory type**

This example disables a custom inventory schema.

Command::

  aws ssm delete-inventory --type-name "Custom:RackInfo" --schema-delete-option "DisableSchema"

Output::

  {
    "DeletionId": "6961492a-8163-44ec-aa1e-923364dd0850",
    "TypeName": "Custom:RackInformation",
    "DeletionSummary": {
        "TotalCount": 0,
        "RemainingCount": 0,
        "SummaryItems": []
    }
  }
