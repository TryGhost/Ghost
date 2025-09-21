**To delete a response plan**

The following ``delete-response-plan`` example deletes the specified response plan. ::

    aws ssm-incidents delete-response-plan \
        --arn "arn:aws:ssm-incidents::111122223333:response-plan/example-response"

This command produces no output.

For more information, see `Incident preparation <https://docs.aws.amazon.com/incident-manager/latest/userguide/incident-response.html>`__ in the *Incident Manager User Guide*.