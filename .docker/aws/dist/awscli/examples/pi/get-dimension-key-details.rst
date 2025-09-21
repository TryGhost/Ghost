**To get details for a specified dimension group for a DB instance**

The following ``get-dimension-key-details`` example retrieves the full text of a SQL statement for DB instance ``db-10BCD2EFGHIJ3KL4M5NO6PQRS5``. The ``--group`` is ``db.sql``, and the ``--group-identifier`` is ``db.sql.id``. In this example, ``example-sql-id`` represents a SQL ID retrieved by using the ``get-resource-metrics`` or ``describe-dimension-keys`` operations. In this example, the dimensions details are available. Thus, Performance Insights retrieves the full text of the SQL statement, without truncating it. ::

    aws pi get-dimension-key-details \
        --service-type RDS \
        --identifier db-10BCD2EFGHIJ3KL4M5NO6PQRS5 \
        --group db.sql \
        --group-identifier example-sql-id \
        --requested-dimensions statement

Output::

    {
        "Dimensions":[
            {
                "Value": "SELECT e.last_name, d.department_name FROM employees e, departments d WHERE e.department_id=d.department_id",
                "Dimension": "db.sql.statement",
                "Status": "AVAILABLE"
            },
        ...
        ]
    }

For more information about dimensions in Performance Insights, see `Database load <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Overview.ActiveSessions.html>`__ in the *Amazon RDS User Guide* and `Database load <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_PerfInsights.Overview.ActiveSessions.html>`__ in the *Amazon Aurora User Guide*.