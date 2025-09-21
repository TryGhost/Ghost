**To describe event categories for a cluster**

The following ``describe-event-categories`` example displays details for the event categories for a cluster. ::

    aws redshift describe-event-categories \
        --source-type cluster

Output::

    {
        "EventCategoriesMapList": [
            {
                "SourceType": "cluster",
                "Events": [
                    {
                        "EventId": "REDSHIFT-EVENT-2000",
                        "EventCategories": [
                            "management"
                        ],
                        "EventDescription": "Cluster <cluster name> created at <time in UTC>.",
                        "Severity": "INFO"
                    },
                    {
                        "EventId": "REDSHIFT-EVENT-2001",
                        "EventCategories": [
                            "management"
                        ],
                        "EventDescription": "Cluster <cluster name> deleted at <time in UTC>.",
                        "Severity": "INFO"
                    },
                    {
                        "EventId": "REDSHIFT-EVENT-3625",
                        "EventCategories": [
                            "monitoring"
                        ],
                        "EventDescription": "The cluster <cluster name> can't be resumed with its previous elastic network interface <ENI id>. We will allocate a new elastic network interface and associate it with the cluster node.",
                        "Severity": "INFO"
                    }
                ]
            }
        ]
    }
