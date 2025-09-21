**To configure the Verified Access policy for an endpoint**

The following ``modify-verified-access-endpoint-policy`` example adds the specified Verified Access policy to the specified Verified Access endpoint. ::

    aws ec2 modify-verified-access-endpoint-policy \
        --verified-access-endpoint-id vae-066fac616d4d546f2 \
        --policy-enabled \
        --policy-document file://policy.txt

Contents of ``policy.txt``::

    permit(principal,action,resource)
    when {
        context.identity.groups.contains("finance") &&
        context.identity.email.verified == true
    };

Output::

    {
        "PolicyEnabled": true,
        "PolicyDocument": "permit(principal,action,resource)\nwhen {\n    context.identity.groups.contains(\"finance\") &&\n    context.identity.email_verified == true\n};"
    }

For more information, see `Verified Access policies <https://docs.aws.amazon.com/verified-access/latest/ug/auth-policies.html>`__ in the *AWS Verified Access User Guide*.
