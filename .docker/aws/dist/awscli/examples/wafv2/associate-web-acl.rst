**To associate a web ACL with a regional AWS resource**

The following ``associate-web-acl`` example associates the specified web ACL with an Application Load Balancer. ::

    aws wafv2 associate-web-acl \
        --web-acl-arn arn:aws:wafv2:us-west-2:123456789012:regional/webacl/test-cli/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 \ 
        --resource-arn arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/app/waf-cli-alb/1ea17125f8b25a2a \ 
        --region us-west-2

This command produces no output.

For more information, see `Associating or Disassociating a Web ACL with an AWS Resource <https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-associating-aws-resource.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
