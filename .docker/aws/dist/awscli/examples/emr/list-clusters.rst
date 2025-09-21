The following command lists all active EMR clusters in the current region::

  aws emr list-clusters --active

Output::

  {
      "Clusters": [
          {
              "Status": {
                  "Timeline": {
                      "ReadyDateTime": 1433200405.353,
                      "CreationDateTime": 1433199926.596
                  },
                  "State": "WAITING",
                  "StateChangeReason": {
                      "Message": "Waiting after step completed"
                  }
              },
              "NormalizedInstanceHours": 6,
              "Id": "j-3SD91U2E1L2QX",
              "Name": "my-cluster"
          }
      ]
  }
