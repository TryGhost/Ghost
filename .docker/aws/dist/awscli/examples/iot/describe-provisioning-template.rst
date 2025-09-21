**To describe a provisioning template**

The following ``describe-provisioning-template`` example describes a provisioning template. ::

    aws iot describe-provisioning-template \
        --template-name MyTestProvisioningTemplate

Output::

    {
        "templateArn": "arn:aws:iot:us-west-2:57EXAMPLE833:provisioningtemplate/MyTestProvisioningTemplate",
        "templateName": "MyTestProvisioningTemplate",
        "creationDate": 1589308310.574,
        "lastModifiedDate": 1589308345.539,
        "defaultVersionId": 1,
        "templateBody": "{
            \"Parameters\":{
                \"SerialNumber\":{
                    \"Type\":\"String\"
                },
                \"AWS::IoT::Certificate::Id\":{
                    \"Type\":\"String\"
                }
            },
            \"Resources\":{
                \"certificate\":{
                    \"Properties\":{
                        \"CertificateId\":{
                            \"Ref\":\"AWS::IoT::Certificate::Id\"
                        },
                        \"Status\":\"Active\"
                    },
                    \"Type\":\"AWS::IoT::Certificate\"
                },
                \"policy\":{
                    \"Properties\":{
                        \"PolicyName\":\"MyIotPolicy\"
                    },
                    \"Type\":\"AWS::IoT::Policy\"
                },
                \"thing\":{
                    \"OverrideSettings\":{
                        \"AttributePayload\":\"MERGE\",
                        \"ThingGroups\":\"DO_NOTHING\",
                        \"ThingTypeName\":\"REPLACE\"
                    },
                    \"Properties\":{
                        \"AttributePayload\":{},
                        \"ThingGroups\":[],
                        \"ThingName\":{
                            \"Fn::Join\":[
                                \"\",
                                [
                                    \"DemoGroup_\",
                                    {\"Ref\":\"SerialNumber\"}
                                ]
                            ]
                        },
                        \"ThingTypeName\":\"VirtualThings\"
                    },
                    \"Type\":\"AWS::IoT::Thing\"
                }
            }
        }",
        "enabled": true,
        "provisioningRoleArn": "arn:aws:iam::571032923833:role/service-role/IoT_access"
    }

For more information, see `Provisioning devices that don't have device certificates using fleet provisioning <https://docs.aws.amazon.com/iot/latest/developerguide/provision-wo-cert.html>`__ in the *AWS IoT Core Developers Guide*.
