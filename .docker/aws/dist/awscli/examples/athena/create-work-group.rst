**To create a workgroup**

The following ``create-work-group`` example creates a workgroup called ``Data_Analyst_Group`` that has the query results output location ``s3://amzn-s3-demo-bucket``. The command creates a workgroup that overrides client configuration settings, which includes the query results output location. The command also  enables CloudWatch metrics and adds three key-value tag pairs to the workgroup to distinguish it from other workgroups. Note that the ``--configuration`` argument has no spaces before the commas that separate its options. ::

    aws athena create-work-group \
        --name Data_Analyst_Group \
        --configuration ResultConfiguration={OutputLocation="s3://amzn-s3-demo-bucket"},EnforceWorkGroupConfiguration="true",PublishCloudWatchMetricsEnabled="true" \
        --description "Workgroup for data analysts" \
        --tags Key=Division,Value=West Key=Location,Value=Seattle Key=Team,Value="Big Data"

This command produces no output. To see the results, use ``aws athena get-work-group --work-group Data_Analyst_Group``.

For more information, see `Managing Workgroups <https://docs.aws.amazon.com/athena/latest/ug/workgroups-create-update-delete.html>`__ in the *Amazon Athena User Guide*.
