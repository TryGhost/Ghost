**To replace a budget for a Cost and Usage budget**

This example replaces a Cost and Usage budget with a new budget.

Command::

  aws budgets update-budget --account-id 111122223333 --new-budget file://new-budget.json

new-budget.json::

  {
      "BudgetLimit": {
         "Amount": "100",
         "Unit": "USD"
      },
      "BudgetName": "Example Budget",
      "BudgetType": "COST",
      "CostFilters": {
         "AZ" : [ "us-east-1" ]
      },
      "CostTypes": {
         "IncludeCredit": false,
         "IncludeDiscount": true,
         "IncludeOtherSubscription": true,
         "IncludeRecurring": true,
         "IncludeRefund": true,
         "IncludeSubscription": true,
         "IncludeSupport": true,
         "IncludeTax": true,
         "IncludeUpfront": true,
         "UseBlended": false,
         "UseAmortized": true
      },
      "TimePeriod": {
         "Start": 1477958399,
         "End": 3706473600
      },
      "TimeUnit": "MONTHLY"
   }

