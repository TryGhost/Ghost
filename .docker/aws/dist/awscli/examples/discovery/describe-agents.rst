**Describe agents with specified collectionStatus states**

This example command describes collection agents with collection status of "STARTED" or "STOPPED".

Command::

  aws discovery describe-agents --filters name="collectionStatus",values="STARTED","STOPPED",condition="EQUALS" --max-results 3

Output::

  {
         "Snapshots": [
  	{
              "version": "1.0.40.0",
              "agentType": "EC2",
              "hostName": "ip-172-31-40-234",
              "collectionStatus": "STOPPED",
              "agentNetworkInfoList": [
                  {
                      "macAddress": "06:b5:97:14:fc:0d",
                      "ipAddress": "172.31.40.234"
                  }
              ],
              "health": "UNKNOWN",
              "agentId": "i-003305c02a776e883",
              "registeredTime": "2016-12-09T19:05:06Z",
              "lastHealthPingTime": "2016-12-09T19:05:10Z"
          },
          {
              "version": "1.0.40.0",
              "agentType": "EC2",
              "hostName": "ip-172-31-39-64",
              "collectionStatus": "STARTED",
              "agentNetworkInfoList": [
                  {
                      "macAddress": "06:a1:0e:c7:b2:73",
                      "ipAddress": "172.31.39.64"
                  }
              ],
              "health": "SHUTDOWN",
              "agentId": "i-003a5e5e2b36cf8bd",
              "registeredTime": "2016-11-16T16:36:25Z",
              "lastHealthPingTime": "2016-11-16T16:47:37Z"
          }
      ]
  }
