**To get a list of tags**

The following ``list-tags-for-resource`` example gets a list of tags for a workflow with id ``1234567``. ::

    aws omics list-tags-for-resource \
        --resource-arn arn:aws:omics:us-west-2:123456789012:workflow/1234567

Output::

    {
        "tags": {
            "department": "analytics"
        }
    }

For more information, see `Tagging resources in Amazon Omics <https://docs.aws.amazon.com/omics/latest/dev/workflows.html>`__ in the *Amazon Omics Developer Guide*.
