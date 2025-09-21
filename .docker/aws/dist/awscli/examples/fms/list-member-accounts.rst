**To retrieve the member accounts in the organization**

The following ``list-member-accounts`` example lists all of the member accounts that are in the Firewall Manager administrator's organization. ::

    aws fms list-member-accounts

Output::

    {
        "MemberAccounts": [
            "222222222222",
            "333333333333",
            "444444444444"
        ]
    }

For more information, see `AWS Firewall Manager <https://docs.aws.amazon.com/waf/latest/developerguide/fms-chapter.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
