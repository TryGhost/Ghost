**To update a user's attribute in a directory**

The following ``update-user`` example updates the specified attribute for the specified user in the specified directory. ::

    aws ds-data update-user \
        --directory-id d-1234567890 \
        --sam-account-name 'john.doe' \
        --update-type 'ADD' \
        --email-address 'example.corp.com'

This command produces no output.

For more information, see `Viewing and updating an AWS Managed Microsoft AD user <https://docs.aws.amazon.com/directoryservice/latest/admin-guide/ms_ad_view_update_user.html>`__ in the *AWS Directory Service Administration Guide*.
