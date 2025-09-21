**To share a Resolver rule with another AWS account**

The following ``put-resolver-rule-policy`` example specifies a Resolver rule that you want to share with another AWS account, the account that you want to share the rule with, and the rule-related operations that you want the account to be able to perform on the rules. 

**Note** You must run this command using credentials from the same account that created the rule. ::

    aws route53resolver put-resolver-rule-policy \
        --region us-east-1 \
        --arn "arn:aws:route53resolver:us-east-1:111122223333:resolver-rule/rslvr-rr-42b60677c0example" \
        --resolver-rule-policy "{\"Version\": \"2012-10-17\", \
            \"Statement\": [ { \
            \"Effect\" : \"Allow\", \
            \"Principal\" : {\"AWS\" : \"444455556666\" }, \
            \"Action\" : [ \
                \"route53resolver:GetResolverRule\", \
                \"route53resolver:AssociateResolverRule\", \
                \"route53resolver:DisassociateResolverRule\", \
                \"route53resolver:ListResolverRules\", \
                \"route53resolver:ListResolverRuleAssociations\" ], \
            \"Resource\" : [ \"arn:aws:route53resolver:us-east-1:111122223333:resolver-rule/rslvr-rr-42b60677c0example\" ] } ] }"

Output::

    {
        "ReturnValue": true
    }

After you run ``put-resolver-rule-policy``, you can run the following two Resource Access Manager (RAM) commands. You must use the account that you want to share the rule with:

- ``get-resource-share-invitations`` returns the value ``resourceShareInvitationArn``. You need this value to accept the invitation to use the shared rule.
- ``accept-resource-share-invitation`` accepts the invitation to use the shared rule.

For more information, see the following documentation:

- `get-resource-share-invitations <https://docs.aws.amazon.com/cli/latest/reference/ram/get-resource-share-invitations.html>`__
- `accept-resource-share-invitations <https://docs.aws.amazon.com/cli/latest/reference/ram/accept-resource-share-invitation.html>`__
- `Sharing Forwarding Rules with Other AWS Accounts and Using Shared Rules <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-rules-managing.html#resolver-rules-managing-sharing>`__ in the *Amazon Route 53 Developer Guide*
