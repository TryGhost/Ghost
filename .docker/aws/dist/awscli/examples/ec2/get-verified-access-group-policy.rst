**To get the Verified Access policy of a group**

The following ``get-verified-access-group-policy`` example gets the Verified Access policy of the specified group. ::

    aws ec2 get-verified-access-group-policy \
        --verified-access-group-id vagr-0dbe967baf14b7235

Output::

    {
        "PolicyEnabled": true,
        "PolicyDocument": "permit(principal,action,resource)\nwhen {\n    context.identity.groups.contains(\"finance\") &&\n    context.identity.email_verified == true\n};"
    }

For more information, see `Verified Access groups <https://docs.aws.amazon.com/verified-access/latest/ug/verified-access-groups.html>`__ in the *AWS Verified Access User Guide*.
