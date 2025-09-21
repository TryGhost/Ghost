**To describe event categories**

The following ``describe-event-categories`` example retrieves details about the event categories for all available event sources. ::

    aws rds describe-event-categories

Output::

    {
        "EventCategoriesMapList": [
            {
                "SourceType": "db-instance",
                "EventCategories": [
                    "deletion",
                    "read replica",
                    "failover",
                    "restoration",
                    "maintenance",
                    "low storage",
                    "configuration change",
                    "backup",
                    "creation",
                    "availability",
                    "recovery",
                    "failure",
                    "backtrack",
                    "notification"
                ]
            },
            {
                "SourceType": "db-security-group",
                "EventCategories": [
                    "configuration change",
                    "failure"
                ]
            },
            {
                "SourceType": "db-parameter-group",
                "EventCategories": [
                    "configuration change"
                ]
            },
            {
                "SourceType": "db-snapshot",
                "EventCategories": [
                    "deletion",
                    "creation",
                    "restoration",
                    "notification"
                ]
            },
            {
                "SourceType": "db-cluster",
                "EventCategories": [
                    "failover",
                    "failure",
                    "notification"
                ]
            },
            {
                "SourceType": "db-cluster-snapshot",
                "EventCategories": [
                    "backup"
                ]
            }
        ]
    }
