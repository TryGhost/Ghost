**To modify the account's AWS Shield Advanced subscription**

The following ``update-subscription`` example enables auto-renewal of the AWS Shield Advanced subscription for the account. ::

    aws shield update-subscription \
        --auto-renew ENABLED

This command produces no output.
       
For more information, see `How AWS Shield Works <https://docs.aws.amazon.com/waf/latest/developerguide/ddos-overview.html>`__ in the *AWS Shield Advanced Developer Guide*.
