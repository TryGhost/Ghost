**To update an entitlement**

The following ``update-flow-entitlement`` example updates the specified entitlement with a new description and subscriber. ::

    aws mediaconnect update-flow-entitlement \
        --flow-arn arn:aws:mediaconnect:us-east-1:111122223333:flow:1-23aBC45dEF67hiJ8-12AbC34DE5fG:BaseballGame \
        --entitlement-arn arn:aws:mediaconnect:us-west-2:111122223333:entitlement:1-11aa22bb11aa22bb-3333cccc4444:AnyCompany_Entitlement \
        --description 'For AnyCompany Affiliate' \
        --subscribers 777788889999

Output::

    {
        "FlowArn": "arn:aws:mediaconnect:us-east-1:111122223333:flow:1-23aBC45dEF67hiJ8-12AbC34DE5fG:BaseballGame",
        "Entitlement": {
            "Name": "AnyCompany_Entitlement",
            "Description": "For AnyCompany Affiliate",
            "EntitlementArn": "arn:aws:mediaconnect:us-west-2:111122223333:entitlement:1-11aa22bb11aa22bb-3333cccc4444:AnyCompany_Entitlement",
            "Encryption": {
                "KeyType": "static-key",
                "Algorithm": "aes128",
                "RoleArn": "arn:aws:iam::111122223333:role/MediaConnect-ASM",
                "SecretArn": "arn:aws:secretsmanager:us-west-2:111122223333:secret:mySecret1"
            },
            "Subscribers": [
                "777788889999"
            ]
        }
    }

For more information, see `Updating an Entitlement <https://docs.aws.amazon.com/mediaconnect/latest/ug/entitlements-update.html>`__ in the *AWS Elemental MediaConnect User Guide*.
