**To update a resource data sync**

The following ``update-resource-data-sync`` example updates a SyncFromSource resource data sync. ::

    aws ssm update-resource-data-sync \
        --sync-name exampleSync \
        --sync-type SyncFromSource \
        --sync-source '{"SourceType":"SingleAccountMultiRegions", "SourceRegions":["us-east-1", "us-west-2"]}'

This command produces no output.

For more information, see `Setting Up Systems Manager Explorer to Display Data from Multiple Accounts and Regions <https://docs.aws.amazon.com/systems-manager/latest/userguide/Explorer-resource-data-sync.html>`__ in the *AWS Systems Manager User Guide*.
