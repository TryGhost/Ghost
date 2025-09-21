**To list workspaces for the account in the Region specified by the user credential**

The following ``list-workspaces`` example lists Grafana workspaces for the account's Region. ::

    aws grafana list-workspaces

Output::

    {
        "workspaces": [
            {
                "authentication": {
                    "providers": [
                        "AWS_SSO"
                    ]
                },
                "created": "2022-04-04T16:20:21.796000-07:00",
                "description": "to test tags",
                "endpoint": "g-949e7b44df.grafana-workspace.us-east-1.amazonaws.com",
                "grafanaVersion": "8.2",
                "id": "g-949e7b44df",
                "modified": "2022-04-04T16:20:21.796000-07:00",
                "name": "testtag2",
                "notificationDestinations": [
                    "SNS"
                ],
                "status": "ACTIVE"
            },
            {
                "authentication": {
                    "providers": [
                        "AWS_SSO"
                    ]
                },
                "created": "2022-04-20T10:22:15.115000-07:00",
                "description": "ww",
                "endpoint": "g-bffa51ed1b.grafana-workspace.us-east-1.amazonaws.com",
                "grafanaVersion": "8.2",
                "id": "g-bffa51ed1b",
                "modified": "2022-04-20T10:22:15.115000-07:00",
                "name": "ww",
                "notificationDestinations": [
                    "SNS"
                ],
                "status": "ACTIVE"
            }
        ]
    }