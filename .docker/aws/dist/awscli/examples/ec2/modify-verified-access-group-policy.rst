**To configure a Verified Access policy for a group**

The following ``modify-verified-access-group-policy`` example adds the specified Verified Access policy to the specified Verified Access group. ::

    aws ec2 modify-verified-access-group-policy \
        --verified-access-group-id vagr-0dbe967baf14b7235 \
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

For more information, see `Verified Access groups <https://docs.aws.amazon.com/verified-access/latest/ug/verified-access-groups.html>`__ in the *AWS Verified Access User Guide*.
