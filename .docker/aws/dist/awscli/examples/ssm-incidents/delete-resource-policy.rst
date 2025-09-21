**To delete a resource policy**

The following ``delete-resource-policy`` example deletes a resource policy from a response plan. This will revoke access from the principal or organization that the response plan was shared with. ::

    aws ssm-incidents delete-resource-policy \
        --policy-id "be8b57191f0371f1c6827341aa3f0a03" \
        --resource-arn "arn:aws:ssm-incidents::111122223333:response-plan/Example-Response-Plan"

This command produces no output.

For more information, see `Working with shared contacts and response plans <https://docs.aws.amazon.com/incident-manager/latest/userguide/sharing.html>`__ in the *Incident Manager User Guide*.