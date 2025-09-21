**To retrieve the Firewall Manager administrator account**

The following ``get-admin-account`` example retrieves the administrator account. ::

    aws fms get-admin-account

Output::

    {
        "AdminAccount": "123456789012",
        "RoleStatus": "READY"
    }

For more information, see `AWS Firewall Manager Prerequisites <https://docs.aws.amazon.com/waf/latest/developerguide/fms-prereq.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
