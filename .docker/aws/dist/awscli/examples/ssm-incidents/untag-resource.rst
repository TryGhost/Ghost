**To remove tags from a response plan**

The following ``untag-resource`` example removes the specified tags from the response plan. ::

    aws ssm-incidents untag-resource \
        --resource-arn "arn:aws:ssm-incidents::111122223333:response-plan/Example-Response-Plan" \
        --tag-keys '["group1"]'

This command produces no output.

For more information, see `Tagging <https://docs.aws.amazon.com/incident-manager/latest/userguide/tagging.html>`__ in the *Incident Manager User Guide*.