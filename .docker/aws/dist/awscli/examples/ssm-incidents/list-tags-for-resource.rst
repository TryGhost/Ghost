**To list tags for a response plan**

The following ``list-tags-for-resource`` example lists the tags associated with the specified response plan. ::

    aws ssm-incidents list-tags-for-resource \
        --resource-arn "arn:aws:ssm-incidents::111122223333:response-plan/Example-Response-Plan" 

Output::

    {
        "tags": {
        "group1": "1"
        }
    }

For more information, see `Tagging <https://docs.aws.amazon.com/incident-manager/latest/userguide/tagging.html>`__ in the *Incident Manager User Guide*.