**To list domain configurations**

The following ``list-domain-configurations`` example lists the domain configurations in your AWS account that have the specified service type. ::

    aws iot list-domain-configurations \
        --service-type "DATA"

Output::

    {
        "domainConfigurations": 
        [       
            {                 
                "domainConfigurationName": "additionalDataDomain",              
                "domainConfigurationArn": "arn:aws:iot:us-west-2:123456789012:domainconfiguration/additionalDataDomain/dikMh",          
                "serviceType": "DATA"         
            },
                
            {               
                "domainConfigurationName": "iot:Jobs",           
                "domainConfigurationArn": "arn:aws:iot:us-west-2:123456789012:domainconfiguration/iot:Jobs",               
                "serviceType": "JOBS"          
            },          
            {               
                "domainConfigurationName": "iot:Data-ATS",              
                "domainConfigurationArn": "arn:aws:iot:us-west-2:123456789012:domainconfiguration/iot:Data-ATS",                
                "serviceType": "DATA"           
            },          
            {               
                "domainConfigurationName": "iot:CredentialProvider",               
                "domainConfigurationArn": "arn:aws:iot:us-west-2:123456789012:domainconfiguration/iot:CredentialProvider",               
                "serviceType": "CREDENTIAL_PROVIDER"           
            }    
        ]
    }

For more information, see `Configurable Endpoints <https://docs.aws.amazon.com/iot/latest/developerguide/iot-custom-endpoints-configurable-aws.html>`__ in the *AWS IoT Developer Guide*.
