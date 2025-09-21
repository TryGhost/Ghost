**To delete an existing filter in the current region**

This example shows how to create delete a filter. ::

    aws guardduty delete-filter \
        --detector-id b6b992d6d2f48e64bc59180bfexample \
        --filter-name byebyeFilter 

This command produces no output.

For more information, see `Filtering findings <https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_filter-findings.html>`__ in the GuardDuty User Guide.