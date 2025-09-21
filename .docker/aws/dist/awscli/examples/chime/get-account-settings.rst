**To retrieve settings for an account**

The following ``get-account-settings`` example retrieves the account settings for the specified account. ::

    aws chime get-account-settings --account-id a1b2c3d4-5678-90ab-cdef-11111EXAMPLE

Output::

    {
        "AccountSettings": {
            "DisableRemoteControl": false,
            "EnableDialOut": false
        }
    }

For more information, see `Managing Your Amazon Chime Accounts <https://docs.aws.amazon.com/chime/latest/ag/manage-chime-account.html>`_ in the *Amazon Chime Administration Guide*.
