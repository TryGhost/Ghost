**To retrieve an outbound calling name**

The following ``get-phone-number-settings`` example retrieves the default outbound calling name for the calling user's AWS account. ::

    aws chime get-phone-number-settings

This command produces no output.
Output::

    {
        "CallingName": "myName",
        "CallingNameUpdatedTimestamp": "2019-10-28T18:56:42.911Z"
    }


For more information, see `Working with Phone Numbers <https://docs.aws.amazon.com/chime/latest/ag/phone-numbers.html>`__ in the *Amazon Chime Administration Guide*.
