**To send notifications of Security Lake exceptions**

The following ``create-data-lake-exception-subscription`` example sends notifications of Security Lake exceptions to the specified account through SMS delivery. The exception message remains for the specified time period. ::

    aws securitylake create-data-lake-exception-subscription \
        --notification-endpoint "123456789012" \
        --exception-time-to-live 30 \
        --subscription-protocol "sms"

This command produces no output.

For more information, see `Troubleshooting Amazon Security Lake <https://docs.aws.amazon.com/security-lake/latest/userguide/security-lake-troubleshoot.html#securitylake-data-lake-troubleshoot>`__ in the *Amazon Security Lake User Guide*.