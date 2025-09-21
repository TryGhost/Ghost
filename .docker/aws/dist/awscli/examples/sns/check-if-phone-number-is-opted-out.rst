**To check SMS message opt-out for a phone number**

The following ``check-if-phone-number-is-opted-out`` example checks whether the specified phone number is opted out of receiving SMS messages from the current AWS account. ::

    aws sns check-if-phone-number-is-opted-out \
        --phone-number +1555550100

Output::

    {
        "isOptedOut": false
    }