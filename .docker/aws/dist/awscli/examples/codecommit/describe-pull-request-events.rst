**To view events in a pull request**

The following ``describe-pull-request-events`` example retrieves the events for a pull request with the ID of '8'. ::

    aws codecommit describe-pull-request-events --pull-request-id 8

Output::

    {
        "pullRequestEvents": [
            {
                "pullRequestId": "8",
                "pullRequestEventType": "PULL_REQUEST_CREATED",
                "eventDate": 1510341779.53,
                "actor": "arn:aws:iam::111111111111:user/Zhang_Wei"
            },
            {
                "pullRequestStatusChangedEventMetadata": {
                    "pullRequestStatus": "CLOSED"
                },
                "pullRequestId": "8",
                "pullRequestEventType": "PULL_REQUEST_STATUS_CHANGED",
                "eventDate": 1510341930.72,
                "actor": "arn:aws:iam::111111111111:user/Jane_Doe"
            }
        ]
    }
