**To update a custom rule group**

The following ``update-rule-group`` changes the visibility configuration for an existing custom rule group. This call requires an ID, which you can obtain from the call, ``list-rule-groups``, and a lock token which you can obtain from the calls, ``list-rule-groups`` and ``get-rule-group``. This call also returns a lock token that you can use for a subsequent update. ::

    aws wafv2 update-rule-group \
        --name TestRuleGroup \
        --scope REGIONAL \
        --id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 \
        --lock-token 7b3bcec2-0000-0000-0000-563bf47249f0 \
        --visibility-config SampledRequestsEnabled=false,CloudWatchMetricsEnabled=false,MetricName=TestMetricsForRuleGroup \
        --region us-west-2

Output::

    {
        "NextLockToken": "1eb5ec48-0000-0000-0000-ee9b906c541e"
    }

For more information, see `Managing Your Own Rule Groups <https://docs.aws.amazon.com/waf/latest/developerguide/waf-user-created-rule-groups.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
