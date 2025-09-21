**Example 1: To describe dimension keys**

This example requests the names of all wait events. The data is summarized by event name, and the aggregate values of those events over the specified time period.

Command::

  aws pi describe-dimension-keys --service-type RDS --identifier db-LKCGOBK26374TPTDFXOIWVCPPM --start-time 1527026400 --end-time 1527080400 --metric db.load.avg --group-by '{"Group":"db.wait_event"}'

Output::

  {
      "AlignedEndTime": 1.5270804E9,
      "AlignedStartTime": 1.5270264E9,
      "Keys": [
          {
              "Dimensions": {"db.wait_event.name": "wait/synch/mutex/innodb/aurora_lock_thread_slot_futex"},
              "Total": 0.05906906851195666
          },
          {
              "Dimensions": {"db.wait_event.name": "wait/io/aurora_redo_log_flush"},
              "Total": 0.015824722186149193
          },
          {
              "Dimensions": {"db.wait_event.name": "CPU"},
              "Total": 0.008014396230265477
          },
          {
              "Dimensions": {"db.wait_event.name": "wait/io/aurora_respond_to_client"},
              "Total": 0.0036361612526204477
          },
          {
              "Dimensions": {"db.wait_event.name": "wait/io/table/sql/handler"},
              "Total": 0.0019108398419382965
          },
          {
              "Dimensions": {"db.wait_event.name": "wait/synch/cond/mysys/my_thread_var::suspend"},
              "Total": 8.533847837782684E-4
          },
          {
              "Dimensions": {"db.wait_event.name": "wait/io/file/csv/data"},
              "Total": 6.864181956477376E-4
          },
          {
              "Dimensions": {"db.wait_event.name": "Unknown"},
              "Total": 3.895887056379051E-4
          },
          {
              "Dimensions": {"db.wait_event.name": "wait/synch/mutex/sql/FILE_AS_TABLE::LOCK_shim_lists"},
              "Total": 3.710368625122906E-5
          },
          {
              "Dimensions": {"db.wait_event.name": "wait/lock/table/sql/handler"},
              "Total": 0
          }
      ]
  }

**Example 2: To find the SQL ID for statements contributing the most to DB load**

The following ``describe-dimension-keys`` requests the SQL statement and SQL ID for the 10 statements that contributed the most to DB load. ::

    aws pi describe-dimension-keys \
        --service-type RDS \
        --identifier db-abcdefg123456789 \
        --start-time 2023-05-01T00:00:00Z \
        --end-time 2023-05-01T01:00:00Z \
        --metric db.load.avg \
        --group-by '{"Group": "db.sql", "Dimensions": ["db.sql.id", "db.sql.statement"],"Limit": 10}'

Output::

    {
        "AlignedEndTime": 1.5270804E9,
        "AlignedStartTime": 1.5270264E9,
        "Identifier": "db-abcdefg123456789",
        "MetricList": [
            {
                "Keys": [
                    {
                        "Dimensions": {"db.sql.id": "AKIAIOSFODNN7EXAMPLE", "db.sql.statement": "SELECT * FROM customers WHERE customer_id = 123"},
                        "Total": 25.5,"Partitions": [12.3, 13.2]
                    }
                ]
            }
        ]
    }

For more information about dimensions in Performance Insights, see `Database load <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Overview.ActiveSessions.html>`__ in the *Amazon RDS User Guide* and `Database load <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_PerfInsights.Overview.ActiveSessions.html>`__ in the *Amazon Aurora User Guide*.