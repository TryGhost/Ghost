**To disassociate a web ACL from a regional AWS resource**

The following ``disassociate-web-acl`` example removes any existing web ACL association from the specified Application Load Balancer. ::

    aws wafv2 disassociate-web-acl \
        --resource-arn arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/app/waf-cli-alb/1ea17125f8b25a2a \
        --region us-west-2

This command produces no output. 

For more information, see `Associating or Disassociating a Web ACL with an AWS Resource <https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-associating-aws-resource.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
