**To remove the default Resource Explorer view for an AWS Region**

The following ``disassociate-default-view`` removes the default Resource Explorer view for the AWS Region in which you call the operation. After performing this operation, all search operations in the Region must explicitly specify a view or the operation fails. ::

    aws resource-explorer-2 disassociate-default-view

This command produces no output.

For more information, see `Setting a default view in an AWS Region <https://docs.aws.amazon.com/resource-explorer/latest/userguide/manage-views-set-default.html>`__ in the *AWS Resource Explorer Users Guide*.