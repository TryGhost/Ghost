**To delete a Resource Explorer view**

The following ``delete-view`` example deletes a view specified by its ARN. ::

    aws resource-explorer-2 delete-view \
        --view-arn arn:aws:resource-explorer-2:us-east-1:123456789012:view/EC2-Only-View/EXAMPLE8-90ab-cdef-fedc-EXAMPLE11111

Output::

    {
        "ViewArn": "arn:aws:resource-explorer-2:us-east-1:123456789012:view/EC2-Only-View/EXAMPLE8-90ab-cdef-fedc-EXAMPLE11111"
    }

For more information, see `Deleting views <https://docs.aws.amazon.com/resource-explorer/latest/userguide/manage-views-delete.html>`__ in the *AWS Resource Explorer Users Guide*.