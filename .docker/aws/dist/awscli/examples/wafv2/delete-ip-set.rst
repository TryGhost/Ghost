**To delete an IP set**

The following ``delete-ip-set`` deletes the specified IP set. This call requires an ID, which you can obtain from the call, ``list-ip-sets``, and a lock token, which you can obtain from the calls, ``list-ip-sets`` and ``get-ip-set``. ::

    aws wafv2 delete-ip-set \
        --name test1 \
        --scope REGIONAL \
        --id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 \
        --lock-token 46851772-db6f-459d-9385-49428812e357

This command produces no output.

For more information, see `IP Sets and Regex Pattern Sets <https://docs.aws.amazon.com/waf/latest/developerguide/waf-referenced-set-managing.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
