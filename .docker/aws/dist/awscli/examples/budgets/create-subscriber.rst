**To create a subscriber for a notification associated with a Cost and Usage budget**

This example creates a subscriber for the specified notification.

Command::

  aws budgets create-subscriber --account-id 111122223333 --budget-name "Example Budget" --notification NotificationType=ACTUAL,ComparisonOperator=GREATER_THAN,Threshold=80,ThresholdType=PERCENTAGE --subscriber SubscriptionType=EMAIL,Address=example@example.com

