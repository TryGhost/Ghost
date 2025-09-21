**To get an AWS IAM policy**

The following ``get-firewall-rule-group-policy`` example gets the AWS Identity and Access Management (AWS IAM) policy for sharing the specified rule group. ::

    aws route53resolver get-firewall-rule-group-policy \
        --arn arn:aws:route53resolver:us-west-2:AWS_ACCOUNT_ID:firewall-rule-group/rslvr-frg-47f93271fexample

Output::

    {
        "FirewallRuleGroupPolicy": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"test\",\"Effect\":\"Allow\",\"Principal\":{\"AWS\":\"arn:aws:iam::AWS_ACCOUNT_ID:root\"},\"Action\":[\"route53resolver:GetFirewallRuleGroup\",\"route53resolver:ListFirewallRuleGroups\"],\"Resource\":\"arn:aws:route53resolver:us-east-1:AWS_ACCOUNT_ID:firewall-rule-group/rslvr-frg-47f93271fexample\"}]}"
    }

For more information, see `Managing rule groups and rules in DNS Firewall <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-dns-firewall-rule-group-managing.html>`__ in the *Amazon Route 53 Developer Guide*.