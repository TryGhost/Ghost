**To retrieve the managed rule groups**

The following ``list-available-managed-rule-groups`` returns the list of all managed rule groups that are currently available for use in your web ACLs. ::


    aws wafv2 list-available-managed-rule-groups \
        --scope REGIONAL

Output::

     {
        "ManagedRuleGroups": [
            {
                "VendorName": "AWS",
                "Name": "AWSManagedRulesCommonRuleSet",
                "Description": "Contains rules that are generally applicable to web applications. This provides protection against exploitation of a wide range of vulnerabilities, including those described in OWASP publications and common Common Vulnerabilities and Exposures (CVE)."
            },
            {
                "VendorName": "AWS",
                "Name": "AWSManagedRulesAdminProtectionRuleSet",
                "Description": "Contains rules that allow you to block external access to exposed admin pages. This may be useful if you are running third-party software or would like to reduce the risk of a malicious actor gaining administrative access to your application."
            },
            {
                "VendorName": "AWS",
                "Name": "AWSManagedRulesKnownBadInputsRuleSet",
                "Description": "Contains rules that allow you to block request patterns that are known to be invalid and are associated with exploitation or discovery of vulnerabilities. This can help reduce the risk of a malicious actor discovering a vulnerable application."
            },
            {
                "VendorName": "AWS",
                "Name": "AWSManagedRulesSQLiRuleSet",
                "Description": "Contains rules that allow you to block request patterns associated with exploitation of SQL databases, like SQL injection attacks. This can help prevent remote injection of unauthorized queries."
            },
            {
                "VendorName": "AWS",
                "Name": "AWSManagedRulesLinuxRuleSet",
                "Description": "Contains rules that block request patterns associated with exploitation of vulnerabilities specific to Linux, including LFI attacks. This can help prevent attacks that expose file contents or execute code for which the attacker should not have had access."
            },
            {
                "VendorName": "AWS",
                "Name": "AWSManagedRulesUnixRuleSet",
                "Description": "Contains rules that block request patterns associated with exploiting vulnerabilities specific to POSIX/POSIX-like OS, including LFI attacks. This can help prevent attacks that expose file contents or execute code for which access should not been allowed."
            },
            {
                "VendorName": "AWS",
                "Name": "AWSManagedRulesWindowsRuleSet",
                "Description": "Contains rules that block request patterns associated with exploiting vulnerabilities specific to Windows, (e.g., PowerShell commands). This can help prevent exploits that allow attacker to run unauthorized commands or execute malicious code."
            },
            {
                "VendorName": "AWS",
                "Name": "AWSManagedRulesPHPRuleSet",
                "Description": "Contains rules that block request patterns associated with exploiting vulnerabilities specific to the use of the PHP, including injection of unsafe PHP functions. This can help prevent exploits that allow an attacker to remotely execute code or commands."
            },
            {
                "VendorName": "AWS",
                "Name": "AWSManagedRulesWordPressRuleSet",
                "Description": "The WordPress Applications group contains rules that block request patterns associated with the exploitation of vulnerabilities specific to WordPress sites."
            },
            {
                "VendorName": "AWS",
                "Name": "AWSManagedRulesAmazonIpReputationList",
                "Description": "This group contains rules that are based on Amazon threat intelligence. This is useful if you would like to block sources associated with bots or other threats."
            }
        ]
    }

For more information, see `Managed Rule Groups <https://docs.aws.amazon.com/waf/latest/developerguide/waf-managed-rule-groups.html>`__ in the *AWS WAF, AWS Firewall Manager, and AWS Shield Advanced Developer Guide*.
