**To list AWS services and service categories**

The following ``describe-services`` example lists the available service categories for requesting general information. ::

    aws support describe-services \
        --service-code-list "general-info"

Output::

    {
        "services": [
            {
                "code": "general-info",
                "name": "General Info and Getting Started",
                "categories": [
                    {
                        "code": "charges",
                        "name": "How Will I Be Charged?"
                    },
                    {
                        "code": "gdpr-queries",
                        "name": "Data Privacy Query"
                    },
                    {
                        "code": "reserved-instances",
                        "name": "Reserved Instances"
                    },
                    {
                        "code": "resource",
                        "name": "Where is my Resource?"
                    },
                    {
                        "code": "using-aws",
                        "name": "Using AWS & Services"
                    },
                    {
                        "code": "free-tier",
                        "name": "Free Tier"
                    },
                    {
                        "code": "security-and-compliance",
                        "name": "Security & Compliance"
                    },
                    {
                        "code": "account-structure",
                        "name": "Account Structure"
                    }
                ]
            }
        ]
    }

For more information, see `Case management <https://docs.aws.amazon.com/awssupport/latest/user/case-management.html>`__ in the *AWS Support User Guide*.
