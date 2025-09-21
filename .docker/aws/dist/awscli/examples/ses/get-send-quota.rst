**To get your Amazon SES sending limits**

The following example uses the ``get-send-quota`` command to return your Amazon SES sending limits::

    aws ses get-send-quota

Output::

 {
    "Max24HourSend": 200.0,
    "SentLast24Hours": 1.0,
    "MaxSendRate": 1.0
 }


Max24HourSend is your sending quota, which is the maximum number of emails that you can send in a 24-hour period.
The sending quota reflects a rolling time period. Every time you try to send an email, Amazon SES checks how many
emails you sent in the previous 24 hours. As long as the total number of emails that you have sent is less than
your quota, your send request will be accepted and your email will be sent.

SentLast24Hours is the number of emails that you have sent in the previous 24 hours.

MaxSendRate is the maximum number of emails that you can send per second.

Note that sending limits are based on recipients rather than on messages. For example, an email that has 10 recipients
counts as 10 against your sending quota.

For more information, see `Managing Your Amazon SES Sending Limits`_ in the *Amazon Simple Email Service Developer Guide*.

.. _`Managing Your Amazon SES Sending Limits`: http://docs.aws.amazon.com/ses/latest/DeveloperGuide/manage-sending-limits.html
