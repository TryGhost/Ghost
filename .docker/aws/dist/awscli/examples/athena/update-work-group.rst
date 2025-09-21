**To update a workgroup**

The following ``update-work-group`` example disables the ``Data_Analyst_Group`` workgroup. Users cannot run or create queries in the disabled workgroup, but can still view metrics, data usage limit controls, workgroup settings, query history, and saved queries. ::

    aws athena update-work-group \
        --work-group Data_Analyst_Group \
        --state DISABLED

This command produces no output. To verify the change in state, use ``aws athena get-work-group --work-group Data_Analyst_Group`` and check the ``State`` property in the output.

For more information, see `Managing Workgroups <https://docs.aws.amazon.com/athena/latest/ug/workgroups-create-update-delete.html>`__ in the *Amazon Athena User Guide*.