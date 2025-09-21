**To replace a notification for a Cost and Usage budget**

This example replaces an 80% notification for a Cost and Usage budget with a 90% notification.

Command::

  aws budgets update-notification --account-id 111122223333 --budget-name "Example Budget" --old-notification  NotificationType=ACTUAL,ComparisonOperator=GREATER_THAN,Threshold=80,ThresholdType=PERCENTAGE --new-notification  NotificationType=ACTUAL,ComparisonOperator=GREATER_THAN,Threshold=90,ThresholdType=PERCENTAGE

