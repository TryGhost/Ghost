**To get the Verified Access policy of an endpoint**

The following ``get-verified-access-endpoint-policy`` example gets the Verified Access policy of the specified endpoint. ::

    aws ec2 get-verified-access-endpoint-policy \
        --verified-access-endpoint-id vae-066fac616d4d546f2

Output::

    {
        "PolicyEnabled": true,
        "PolicyDocument": "permit(principal,action,resource)\nwhen {\n    context.identity.groups.contains(\"finance\") &&\n    context.identity.email_verified == true\n};"
    }

For more information, see `Verified Access policies <https://docs.aws.amazon.com/verified-access/latest/ug/auth-policies.html>`__ in the *AWS Verified Access User Guide*.
