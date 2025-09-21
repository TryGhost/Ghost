**To retrieve a list of notification subscriptions**

The following ``describe-notification-subscriptions`` example retrieves the notification subscriptions for the specified Amazon WorkDocs organization. ::

    aws workdocs describe-notification-subscriptions \
        --organization-id d-123456789c

Output::

    {
        "Subscriptions": [
            {
                "SubscriptionId": "123ab4c5-678d-901e-f23g-45h6789j0123",
                "EndPoint": "https://example.com/example",
                "Protocol": "HTTPS"
            }
        ]
    }

For more information, see `Subscribe to Notifications <https://docs.aws.amazon.com/workdocs/latest/developerguide/subscribe-notifications.html>`__ in the *Amazon WorkDocs Developer Guide*.
