**To attach an AWS IAM policy to share a Firewall rule group policy**

The following ``put-firewall-rule-group-policy`` example attaches an AWS Identity and Access Management (AWS IAM) policy for sharing the rule group. ::

    aws route53resolver put-firewall-rule-group-policy \
        --firewall-rule-group-policy "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"test\",\"Effect\":\"Allow\",\"Principal\":{\"AWS\":\"arn:aws:iam::AWS_ACCOUNT_ID:root\"},\"Action\":[\"route53resolver:GetFirewallRuleGroup\",\"route53resolver:ListFirewallRuleGroups\"],\"Resource\":\"arn:aws:route53resolver:us-east-1:AWS_ACCOUNT_ID:firewall-rule-group/rslvr-frg-47f93271fexample\"}]}"

Output::

    {
        "ReturnValue": true
    }

For more information, see `Managing rule groups and rules in DNS Firewall <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-dns-firewall-rule-group-managing.html>`__ in the *Amazon Route 53 Developer Guide*.