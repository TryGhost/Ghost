**To update a group's attribute in a directory**

The following ``update-group`` example updates the specified attribute for the specified group in the specified directory. ::

    aws ds-data update-group \
        --directory-id d-1234567890 \
        --sam-account-name 'sales' \
        --update-type 'REPLACE' \
        --group-type 'Distribution'

This command produces no output.

For more information, see `Viewing and updating an AWS Managed Microsoft AD group's details <https://docs.aws.amazon.com/directoryservice/latest/admin-guide/ms_ad_view_update_group.html>`__ in the *AWS Directory Service Administration Guide*.
