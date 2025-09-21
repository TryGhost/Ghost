**To add a group member to a directory**

The following ``add-group-member`` example adds the specified user to the specified group in the specified directory. ::

    aws ds-data add-group-member \
        --directory-id d-1234567890 \
        --group-name 'sales' \
        --member-name 'john.doe'

This command produces no output.

For more information, see `Adding or removing AWS Managed Microsoft AD members to groups and groups to groups <https://docs.aws.amazon.com/directoryservice/latest/admin-guide/ms_ad_add_remove_user_group.html>`__ in the *AWS Directory Service Administration Guide*.
