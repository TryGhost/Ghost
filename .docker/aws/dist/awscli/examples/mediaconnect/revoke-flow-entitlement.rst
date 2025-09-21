**To revoke an entitlement**

The following ``revoke-flow-entitlement`` example revokes an entitlement on the specified flow. ::

    aws mediaconnect revoke-flow-entitlement \
        --flow-arn arn:aws:mediaconnect:us-east-1:111122223333:flow:1-23aBC45dEF67hiJ8-12AbC34DE5fG:BaseballGame \
        --entitlement-arn arn:aws:mediaconnect:us-west-2:111122223333:entitlement:1-11aa22bb11aa22bb-3333cccc4444:AnyCompany_Entitlement

Output::

    {
        "FlowArn": "arn:aws:mediaconnect:us-east-1:111122223333:flow:1-23aBC45dEF67hiJ8-12AbC34DE5fG:BaseballGame",
        "EntitlementArn": "arn:aws:mediaconnect:us-west-2:111122223333:entitlement:1-11aa22bb11aa22bb-3333cccc4444:AnyCompany_Entitlement"
    }

For more information, see `Revoking an Entitlement <https://docs.aws.amazon.com/mediaconnect/latest/ug/entitlements-revoke.html>`__ in the *AWS Elemental MediaConnect User Guide*.
