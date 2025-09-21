**To remove a tag from a Resource Explorer view**

The following ``untag-resource`` example removes any tag with the key name "environment" from the view with the specified ARN. ::

    aws resource-explorer-2 untag-resource \
        --resource-arn arn:aws:resource-explorer-2:us-east-1:123456789012:view/My-View//EXAMPLE8-90ab-cdef-fedc-EXAMPLE11111 \
        --tag-keys environment

This command produces no output.

For more information, see `Tagging views for access control <https://docs.aws.amazon.com/resource-explorer/latest/userguide/manage-views-tag.html>`__ in the *AWS Resource Explorer Users Guide*.