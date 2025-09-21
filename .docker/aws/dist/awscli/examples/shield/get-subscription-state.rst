**To retrieve the current state of the account's AWS Shield Advanced subscription**

The following ``get-subscription-state`` example retrieves the state of the Shield Advanced protection for the account. ::

    aws shield get-subscription-state

Output::

    {
        "SubscriptionState": "ACTIVE"
    }

For more information, see `How AWS Shield Works <https://docs.aws.amazon.com/waf/latest/developerguide/ddos-overview.html>`__ in the *AWS Shield Advanced Developer Guide*.
