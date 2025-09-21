**To grant an entitlement on a flow**

The following ``grant-flow-entitlements`` example grants an entitlement to the specified existing flow to share your content with another AWS account. ::

    aws mediaconnect grant-flow-entitlements \
        --flow-arn arn:aws:mediaconnect:us-east-1:111122223333:flow:1-23aBC45dEF67hiJ8-12AbC34DE5fG:BaseballGame \
        --entitlements Description='For AnyCompany',Encryption={"Algorithm=aes128,KeyType=static-key,RoleArn=arn:aws:iam::111122223333:role/MediaConnect-ASM,SecretArn=arn:aws:secretsmanager:us-west-2:111122223333:secret:mySecret1"},Name=AnyCompany_Entitlement,Subscribers=444455556666 Description='For Example Corp',Name=ExampleCorp,Subscribers=777788889999

Output::

    {
        "Entitlements": [
            {
                "Name": "AnyCompany_Entitlement",
                "EntitlementArn": "arn:aws:mediaconnect:us-west-2:111122223333:entitlement:1-11aa22bb11aa22bb-3333cccc4444:AnyCompany_Entitlement",
                "Subscribers": [
                    "444455556666"
                ],
                "Description": "For AnyCompany",
                "Encryption": {
                    "SecretArn": "arn:aws:secretsmanager:us-west-2:111122223333:secret:mySecret1",
                    "Algorithm": "aes128",
                    "RoleArn": "arn:aws:iam::111122223333:role/MediaConnect-ASM",
                    "KeyType": "static-key"
                }
            },
            {
                "Name": "ExampleCorp",
                "EntitlementArn": "arn:aws:mediaconnect:us-west-2:111122223333:entitlement:1-3333cccc4444dddd-1111aaaa2222:ExampleCorp",
                "Subscribers": [
                    "777788889999"
                ],
                "Description": "For Example Corp"
            }
        ],
        "FlowArn": "arn:aws:mediaconnect:us-east-1:111122223333:flow:1-23aBC45dEF67hiJ8-12AbC34DE5fG:BaseballGame"
    }

For more information, see `Granting an Entitlement on a Flow <https://docs.aws.amazon.com/mediaconnect/latest/ug/entitlements-grant.html>`__ in the *AWS Elemental MediaConnect User Guide*.
