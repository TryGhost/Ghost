**Note: This command can only be used with HBase on AMI version 2.x and 3.x**

**1. To schedule a full HBase backup**
>>>>>>> 06ab6d6e13564b5733d75abaf3b599f93cf39a23

- Command::

    aws emr schedule-hbase-backup --cluster-id j-XXXXXXYY --type full --dir
    s3://amzn-s3-demo-bucket/backup --interval 10 --unit hours --start-time
    2014-04-21T05:26:10Z --consistent

- Output::

    None


**2. To schedule an incremental HBase backup**

- Command::

    aws emr schedule-hbase-backup --cluster-id j-XXXXXXYY --type incremental
     --dir s3://amzn-s3-demo-bucket/backup --interval 30 --unit minutes --start-time
    2014-04-21T05:26:10Z --consistent

- Output::

    None

