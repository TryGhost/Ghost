**To delete a workgroup**

The following ``delete-work-group`` example deletes the ``TeamB`` workgroup. ::

    aws athena delete-work-group \
        --work-group TeamB

This command produces no output. To confirm the deletion, use ``aws athena list-work-groups``.

For more information, see `Managing Workgroups <https://docs.aws.amazon.com/athena/latest/ug/workgroups-create-update-delete.html>`__ in the *Amazon Athena User Guide*.