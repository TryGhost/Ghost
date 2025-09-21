Describe Reserved Nodes
-----------------------

This example shows a reserved node offering that has been purchased.

Command::

   aws redshift describe-reserved-nodes

Result::

    {
       "ResponseMetadata": {
          "RequestId": "bc29ce2e-7600-11e2-9949-4b361e7420b7"
       },
       "ReservedNodes": [
          {
             "OfferingType": "Heavy Utilization",
             "FixedPrice": "",
             "NodeType": "dw.hs1.xlarge",
             "ReservedNodeId": "1ba8e2e3-bc01-4d65-b35d-a4a3e931547e",
             "UsagePrice": "",
             "RecurringCharges": [
                {
                   "RecurringChargeAmount": "",
                   "RecurringChargeFrequency": "Hourly"
                } ],
             "NodeCount": 1,
             "State": "payment-pending",
             "StartTime": "2013-02-13T17:08:39.051Z",
             "Duration": 31536000,
             "ReservedNodeOfferingId": "ceb6a579-cf4c-4343-be8b-d832c45ab51c"
          }
       ]
    }

