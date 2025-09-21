**To retrieve history for an alarm**

The following example uses the ``describe-alarm-history`` command to retrieve history for the Amazon
CloudWatch alarm named "myalarm"::

  aws cloudwatch describe-alarm-history --alarm-name "myalarm" --history-item-type StateUpdate

Output::

  {
      "AlarmHistoryItems": [
          {
              "Timestamp": "2014-04-09T18:59:06.442Z",
              "HistoryItemType": "StateUpdate",
              "AlarmName": "myalarm",
              "HistoryData": "{\"version\":\"1.0\",\"oldState\":{\"stateValue\":\"ALARM\",\"stateReason\":\"testing purposes\"},\"newState\":{\"stateValue\":\"OK\",\"stateReason\":\"Threshold Crossed: 2 datapoints were not greater than the threshold (70.0). The most recent datapoints: [38.958, 40.292].\",\"stateReasonData\":{\"version\":\"1.0\",\"queryDate\":\"2014-04-09T18:59:06.419+0000\",\"startDate\":\"2014-04-09T18:44:00.000+0000\",\"statistic\":\"Average\",\"period\":300,\"recentDatapoints\":[38.958,40.292],\"threshold\":70.0}}}",
              "HistorySummary": "Alarm updated from ALARM to OK"
          },
          {
              "Timestamp": "2014-04-09T18:59:05.805Z",
              "HistoryItemType": "StateUpdate",
              "AlarmName": "myalarm",
              "HistoryData": "{\"version\":\"1.0\",\"oldState\":{\"stateValue\":\"OK\",\"stateReason\":\"Threshold Crossed: 2 datapoints were not greater than the threshold (70.0). The most recent datapoints: [38.839999999999996, 39.714].\",\"stateReasonData\":{\"version\":\"1.0\",\"queryDate\":\"2014-03-11T22:45:41.569+0000\",\"startDate\":\"2014-03-11T22:30:00.000+0000\",\"statistic\":\"Average\",\"period\":300,\"recentDatapoints\":[38.839999999999996,39.714],\"threshold\":70.0}},\"newState\":{\"stateValue\":\"ALARM\",\"stateReason\":\"testing purposes\"}}",
              "HistorySummary": "Alarm updated from OK to ALARM"
          }
      ]
  }

