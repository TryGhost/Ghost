**To create a Cost and Usage budget**

The following ``create-budget`` command creates a Cost and Usage budget. ::

    aws budgets create-budget \
        --account-id 111122223333 \
        --budget file://budget.json \
        --notifications-with-subscribers file://notifications-with-subscribers.json
        
Contents of ``budget.json``::

    {
        "BudgetLimit": {
            "Amount": "100",
            "Unit": "USD"
        },
        "BudgetName": "Example Tag Budget",
        "BudgetType": "COST",
        "CostFilters": {
            "TagKeyValue": [
                "user:Key$value1",
                "user:Key$value2"
            ]
        },
        "CostTypes": {
            "IncludeCredit": true,
            "IncludeDiscount": true,
            "IncludeOtherSubscription": true,
            "IncludeRecurring": true,
            "IncludeRefund": true,
            "IncludeSubscription": true,
            "IncludeSupport": true,
            "IncludeTax": true,
            "IncludeUpfront": true,
            "UseBlended": false
        },
        "TimePeriod": {
            "Start": 1477958399,
            "End": 3706473600
        },
        "TimeUnit": "MONTHLY"
    }

Contents of ``notifications-with-subscribers.json``::

    [
        {
            "Notification": {
                "ComparisonOperator": "GREATER_THAN",
                "NotificationType": "ACTUAL",
                "Threshold": 80,
                "ThresholdType": "PERCENTAGE"
            },
            "Subscribers": [
                {
                    "Address": "example@example.com",
                    "SubscriptionType": "EMAIL"
                }
            ]
        }
    ]
