**To get the effect of access control rules**

The following ``get-access-control-effect`` example retrieves the effect of the specified Amazon WorkMail organization's access control rules for the specified IP address, access protocol action, and user ID. ::

    aws workmail get-access-control-effect \
        --organization-id m-n1pq2345678r901st2u3vx45x6789yza \
        --ip-address "192.0.2.0" \
        --action "WindowsOutlook" \
        --user-id "S-1-1-11-1111111111-2222222222-3333333333-3333"

Output::

    {
        "Effect": "DENY",
        "MatchedRules": [
            "myRule"
        ]
    }

For more information, see `Working with Access Control Rules <https://docs.aws.amazon.com/workmail/latest/adminguide/access-rules.html>`__ in the *Amazon WorkMail Administrator Guide*.
