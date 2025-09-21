**To tag a Resource Explorer view**

The following ``tag-resource`` example adds the tag key "environment" with the value "production" to the view with the specified ARN. ::

    aws resource-explorer-2 tag-resource \
        --resource-arn arn:aws:resource-explorer-2:us-east-1:123456789012:view/My-View//EXAMPLE8-90ab-cdef-fedc-EXAMPLE11111 \
        --tags environment=production

This command produces no output.

For more information, see `Tagging views for access control <https://docs.aws.amazon.com/resource-explorer/latest/userguide/manage-views-tag.html>`__ in the *AWS Resource Explorer Users Guide*.