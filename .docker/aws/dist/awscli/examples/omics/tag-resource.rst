**To tag a resource**

The following ``tag-resource`` example adds a ``department`` tag to a workflow with id ``1234567``. ::

    aws omics tag-resource \
        --resource-arn arn:aws:omics:us-west-2:123456789012:workflow/1234567 \
        --tags department=analytics

For more information, see `Tagging resources in Amazon Omics <https://docs.aws.amazon.com/omics/latest/dev/workflows.html>`__ in the *Amazon Omics Developer Guide*.
