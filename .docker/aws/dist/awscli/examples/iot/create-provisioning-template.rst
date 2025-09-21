**To create a provisioning template**

The following ``create-provisioning-template`` example creates a provisioning template as defined by the file ``template.json``. :: 

    aws iot create-provisioning-template \
        --template-name widget-template \
        --description "A provisioning template for widgets" \
        --provisioning-role-arn arn:aws:iam::123456789012:role/Provision_role \
        --template-body file://template.json

Contents of ``template.json``::

    {
        "Parameters" : {
            "DeviceLocation": {
                "Type": "String"
            }
        },
        "Mappings": {
            "LocationTable": {
                "Seattle": {
                    "LocationUrl": "https://example.aws"
                }
            }
        },
        "Resources" : {
            "thing" : {
                "Type" : "AWS::IoT::Thing",
                "Properties" : {
                    "AttributePayload" : { 
                        "version" : "v1",
                        "serialNumber" : "serialNumber"
                    },
                    "ThingName" : {"Fn::Join":["",["ThingPrefix_",{"Ref":"SerialNumber"}]]},
                    "ThingTypeName" : {"Fn::Join":["",["ThingTypePrefix_",{"Ref":"SerialNumber"}]]},
                    "ThingGroups" : ["widgets", "WA"],
                    "BillingGroup": "BillingGroup"
                },
                "OverrideSettings" : {
                    "AttributePayload" : "MERGE",
                    "ThingTypeName" : "REPLACE",
                    "ThingGroups" : "DO_NOTHING"
                }
            },
            "certificate" : {
                "Type" : "AWS::IoT::Certificate",
                "Properties" : {
                    "CertificateId": {"Ref": "AWS::IoT::Certificate::Id"},
                    "Status" : "Active"
                }
            },
            "policy" : {
                "Type" : "AWS::IoT::Policy",
                "Properties" : {
                    "PolicyDocument" : {
                        "Version": "2012-10-17",
                        "Statement": [{
                            "Effect": "Allow",
                            "Action":["iot:Publish"],
                            "Resource": ["arn:aws:iot:us-east-1:504350838278:topic/foo/bar"]
                        }]
                    }
                }
            }
        },
        "DeviceConfiguration": {
            "FallbackUrl": "https://www.example.com/test-site",
            "LocationUrl": {
                "Fn::FindInMap": ["LocationTable",{"Ref": "DeviceLocation"}, "LocationUrl"]}
            }
        }    
    }

Output::

    {
        "templateArn": "arn:aws:iot:us-east-1:123456789012:provisioningtemplate/widget-template",
        "templateName": "widget-template",
        "defaultVersionId": 1
    }

For more information, see `AWS IoT Secure Tunneling <https://docs.aws.amazon.com/iot/latest/developerguide/secure-tunneling.html>`__ in the *AWS IoT Core Developer Guide*.
