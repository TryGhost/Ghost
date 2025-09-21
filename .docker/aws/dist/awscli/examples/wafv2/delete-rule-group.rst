**To delete a custom rule group**

The following ``delete-rule-group`` deletes the specified custom rule group. This call requires an ID, which you can obtain from the call, ``list-rule-groups``, and a lock token, which you can obtain from the call ``list-rule-groups`` or the call ``get-rule-group``. ::

    aws wafv2 delete-rule-group \
        --name TestRuleGroup \
        --scope REGIONAL \
        --id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 \
        --lock-token 7b3bcec2-0000-0000-0000-563bf47249f0 

This command produces no output.

For more information, see `Managing Your Own Rule Groups <https://docs.aws.amazon.com/waf/latest/developerguide/waf-user-created-rule-groups.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
