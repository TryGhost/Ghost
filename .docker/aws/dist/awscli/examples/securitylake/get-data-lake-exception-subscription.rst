**To get details about an exception subscription**

The following ``get-data-lake-exception-subscription`` example provides details about a Security Lake exception subscription. In this example, the user of the specified AWS account is notified of errors through SMS delivery. The exception message remains in the account for the specified time period. An exception subscription notifies a Security Lake user about an error through the requester's preferred protocol. ::

    aws securitylake get-data-lake-exception-subscription 

Output::

    {
        "exceptionTimeToLive": 30,
        "notificationEndpoint": "123456789012",
        "subscriptionProtocol": "sms"
    }

For more information, see `Troubleshooting data lake status <https://docs.aws.amazon.com/securityhub/latest/userguide/security-lake-troubleshoot.html#securitylake-data-lake-troubleshoot>`__ in the *Amazon Security Lake User Guide*.