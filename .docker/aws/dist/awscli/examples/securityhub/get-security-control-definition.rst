**To get security control definition details**

The following ``get-security-control-definition`` example retrieves definition details for a Security Hub security control. Details include the control title, description, Region availability, parameters, and other information. ::

    aws securityhub get-security-control-definition \
        --security-control-id ACM.1

Output::

    {
        "SecurityControlDefinition": {
            "SecurityControlId": "ACM.1",
            "Title": "Imported and ACM-issued certificates should be renewed after a specified time period",
            "Description": "This control checks whether an AWS Certificate Manager (ACM) certificate is renewed within the specified time period. It checks both imported certificates and certificates provided by ACM. The control fails if the certificate isn't renewed within the specified time period. Unless you provide a custom parameter value for the renewal period, Security Hub uses a default value of 30 days.",
            "RemediationUrl": "https://docs.aws.amazon.com/console/securityhub/ACM.1/remediation",
            "SeverityRating": "MEDIUM",
            "CurrentRegionAvailability": "AVAILABLE",
            "ParameterDefinitions": {
                "daysToExpiration": {
                    "Description": "Number of days within which the ACM certificate must be renewed",
                    "ConfigurationOptions": {
                        "Integer": {
                            "DefaultValue": 30,
                            "Min": 14,
                            "Max": 365
                        }
                    }
                }
            }
        }
    }

For more information, see `Custom control parameters <https://docs.aws.amazon.com/securityhub/latest/userguide/custom-control-parameters.html>`__ in the *AWS Security Hub User Guide*.