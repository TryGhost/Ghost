**To get descriptions of custom domain names associated with a service**

The following ``describe-custom-domains`` example get descriptions and status of the custom domain names associated with an App Runner service. ::

    aws apprunner describe-custom-domains \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "ServiceArn": "arn:aws:apprunner:us-east-1:123456789012:service/python-app/8fe1e10304f84fd2b0df550fe98a71fa",
        "DomainName": "example.com",
        "EnableWWWSubdomain": true
    }

Output::

    {
        "CustomDomains": [
            {
                "CertificateValidationRecords": [
                    {
                        "Name": "_70d3f50a94f7c72dc28784cf55db2f6b.example.com",
                        "Status": "PENDING_VALIDATION",
                        "Type": "CNAME",
                        "Value": "_1270c137383c6307b6832db02504c4b0.bsgbmzkfwj.acm-validations.aws."
                    },
                    {
                        "Name": "_287870d3f50a94f7c72dc4cf55db2f6b.www.example.com",
                        "Status": "PENDING_VALIDATION",
                        "Type": "CNAME",
                        "Value": "_832db01270c137383c6307b62504c4b0.mzkbsgbfwj.acm-validations.aws."
                    }
                ],
                "DomainName": "example.com",
                "EnableWWWSubdomain": true,
                "Status": "PENDING_CERTIFICATE_DNS_VALIDATION"
            },
            {
                "CertificateValidationRecords": [
                    {
                        "Name": "_a94f784c70d3f507c72dc28f55db2f6b.deals.example.com",
                        "Status": "SUCCESS",
                        "Type": "CNAME",
                        "Value": "_2db02504c1270c137383c6307b6834b0.bsgbmzkfwj.acm-validations.aws."
                    }
                ],
                "DomainName": "deals.example.com",
                "EnableWWWSubdomain": false,
                "Status": "ACTIVE"
            }
        ],
        "DNSTarget": "psbqam834h.us-east-1.awsapprunner.com",
        "ServiceArn": "arn:aws:apprunner:us-east-1:123456789012:service/python-app/8fe1e10304f84fd2b0df550fe98a71fa"
    }
