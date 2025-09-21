**To create a notification subscription**

The following ``create-notification-subscription`` example configures a notification subscription for the specified Amazon WorkDocs organization. ::

    aws workdocs create-notification-subscription \
        --organization-id d-123456789c \
        --protocol HTTPS \
        --subscription-type ALL \
        --notification-endpoint "https://example.com/example"

Output::

    {
        "Subscription": {
            "SubscriptionId": "123ab4c5-678d-901e-f23g-45h6789j0123",
            "EndPoint": "https://example.com/example",
            "Protocol": "HTTPS"
        }
    }

For more information, see `Subscribe to Notifications <https://docs.aws.amazon.com/workdocs/latest/developerguide/subscribe-notifications.html>`__ in the *Amazon WorkDocs Developer Guide*.
