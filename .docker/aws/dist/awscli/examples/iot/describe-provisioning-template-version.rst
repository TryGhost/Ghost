**To describe a provisioning template version**

The following ``describe-provisioning-template-version`` example describes a provisioning template version. ::

    aws iot describe-provisioning-template-version \
        --template-name MyTestProvisioningTemplate \
        --version-id 1

Output::

    {
        "versionId": 1,
        "creationDate": 1589308310.574,
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
        "isDefaultVersion": true
    }

For more information, see `Provisioning devices that don't have device certificates using fleet provisioning <https://docs.aws.amazon.com/iot/latest/developerguide/provision-wo-cert.html>`__ in the *AWS IoT Core Developers Guide*.
