**To describe logging status for a cluster**

The following ``describe-logging-status`` example displays whether information, such as queries and connection attempts, is being logged for a cluster. ::

    aws redshift describe-logging-status \
        --cluster-identifier mycluster

Output::

    {
        "LoggingEnabled": false
    }

For more information, see `Database Audit Logging <https://docs.aws.amazon.com/redshift/latest/mgmt/db-auditing.html>`__ in the *Amazon Redshift Cluster Management Guide*.
