**To tag a response plan**

The following ``tag-resource`` example tags a specified response plan with the provided tag key-value pair. ::

    aws ssm-incidents tag-resource \
        --resource-arn "arn:aws:ssm-incidents::111122223333:response-plan/Example-Response-Plan" \
        --tags '{"group1":"1"}'

This command produces no output.

For more information, see `Tagging <https://docs.aws.amazon.com/incident-manager/latest/userguide/tagging.html>`__ in the *Incident Manager User Guide*.