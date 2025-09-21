**To enable or disable Easy DKIM for an Amazon SES verified identity**

The following example uses the ``set-identity-dkim-enabled`` command to disable DKIM for a verified email address::

    aws ses set-identity-dkim-enabled --identity user@example.com --no-dkim-enabled

For more information about Easy DKIM, see `Easy DKIM in Amazon SES`_ in the *Amazon Simple Email Service Developer Guide*.

.. _`Easy DKIM in Amazon SES`: http://docs.aws.amazon.com/ses/latest/DeveloperGuide/easy-dkim.html

