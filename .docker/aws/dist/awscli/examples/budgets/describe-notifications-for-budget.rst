**To retrieve the notifications for a budget**

This example retrieves the notifications for a Cost and Usage budget.

Command::

  aws budgets describe-notifications-for-budget --account-id 111122223333 --budget-name "Example Budget" --max-results 5

Output::

 {
    "Notifications": [
        {
            "Threshold": 80.0,
            "ComparisonOperator": "GREATER_THAN",
            "NotificationType": "ACTUAL"
        }
    ]
 }	
