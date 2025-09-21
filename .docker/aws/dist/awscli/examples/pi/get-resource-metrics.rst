**To get resource metrics**

This example requests data points for the *db.wait_event* dimension group, and for the *db.wait_event.name* dimension within that group. In the response, the relevant data points are grouped by the requested dimension (*db.wait_event.name*).



Command::

  aws pi get-resource-metrics --service-type RDS --identifier db-LKCGOBK26374TPTDFXOIWVCPPM --start-time 1527026400 --end-time 1527080400 --period-in-seconds 300 --metric db.load.avg --metric-queries file://metric-queries.json

The arguments for ``--metric-queries`` are stored in a JSON file, ``metric-queries.json``.  Here are the contents of that file::

  [
      {
          "Metric": "db.load.avg",
          "GroupBy": { 
              "Group":"db.wait_event" 
          }
      }
  ]


Output::

  {
      "AlignedEndTime": 1.5270804E9,
      "AlignedStartTime": 1.5270264E9,
      "Identifier": "db-LKCGOBK26374TPTDFXOIWVCPPM",
      "MetricList": [
          {
              "Key": {
                  "Metric": "db.load.avg"
              },
              "DataPoints": [
                  {
                      "Timestamp": 1527026700.0,
                      "Value": 1.3533333333333333
                  },
                  {
                      "Timestamp": 1527027000.0,
                      "Value": 0.88
                  },
                  <...remaining output omitted...>
              ]
          },
          {
              "Key": {
                  "Metric": "db.load.avg",
                  "Dimensions": {
                      "db.wait_event.name": "wait/synch/mutex/innodb/aurora_lock_thread_slot_futex"
                  }
              },
              "DataPoints": [
                  {
                      "Timestamp": 1527026700.0,
                      "Value": 0.8566666666666667
                  },
                  {
                      "Timestamp": 1527027000.0,
                      "Value": 0.8633333333333333
                  },
                  <...remaining output omitted...>
              ],
          },
              <...remaining output omitted...>
      ]
  }
