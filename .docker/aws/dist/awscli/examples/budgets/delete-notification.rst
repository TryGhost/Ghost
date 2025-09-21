**To delete a notification from a budget**

This example deletes the specified notification from the specified budget.

Command::

  aws budgets delete-notification --account-id 111122223333 --budget-name "Example Budget" --notification NotificationType=ACTUAL,ComparisonOperator=GREATER_THAN,Threshold=80,ThresholdType=PERCENTAGE 
  
