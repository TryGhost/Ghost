**To get inventory deletions**

This example retrieves details for inventory deletion operations.

Command::

  aws ssm describe-inventory-deletions

Output::

  {
    "InventoryDeletions": [
        {
            "DeletionId": "6961492a-8163-44ec-aa1e-01234567850",
            "TypeName": "Custom:RackInformation",
            "DeletionStartTime": 1550254911.0,
            "LastStatus": "InProgress",
            "LastStatusMessage": "The Delete is in progress",
            "DeletionSummary": {
                "TotalCount": 0,
                "RemainingCount": 0,
                "SummaryItems": []
            },
            "LastStatusUpdateTime": 1550254911.0
        },
        {
            "DeletionId": "d72ac9e8-1f60-4d40-b1c6-987654321c4d",
            "TypeName": "Custom:RackInfo",
            "DeletionStartTime": 1550254859.0,
            "LastStatus": "InProgress",
            "LastStatusMessage": "The Delete is in progress",
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
            },
            "LastStatusUpdateTime": 1550254859.0
        }
    ]
  }

**To get details of a specific inventory deletion**

This example retrieves details for a specific inventory deletion operation.

Command::

  aws ssm describe-inventory-deletions --deletion-id "d72ac9e8-1f60-4d40-b1c6-987654321c4d"

Output::

  {
    "InventoryDeletions": [
        {
            "DeletionId": "d72ac9e8-1f60-4d40-b1c6-987654321c4d",
            "TypeName": "Custom:RackInfo",
            "DeletionStartTime": 1550254859.0,
            "LastStatus": "InProgress",
            "LastStatusMessage": "The Delete is in progress",
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
            },
            "LastStatusUpdateTime": 1550254859.0
        }
    ]
  }
