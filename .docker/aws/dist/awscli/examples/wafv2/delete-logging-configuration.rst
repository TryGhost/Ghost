**To disable logging for a web ACL**

The following ``delete-logging-configuration`` removes any logging configuration from the specified web ACL. ::

    aws wafv2 delete-logging-configuration \
        --resource-arn arn:aws:wafv2:us-west-2:123456789012:regional/webacl/test/a1b2c3d4-5678-90ab-cdef-EXAMPLE22222

This command produces no output.

For more information, see `Logging Web ACL Traffic Information <https://docs.aws.amazon.com/waf/latest/developerguide/logging.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
