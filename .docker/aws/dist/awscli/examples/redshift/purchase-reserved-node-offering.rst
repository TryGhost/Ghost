Purchase a Reserved Node
------------------------

This example shows how to purchase a reserved node offering. The ``reserved-node-offering-id`` is obtained by
calling ``describe-reserved-node-offerings``.

Command::

   aws redshift purchase-reserved-node-offering --reserved-node-offering-id ceb6a579-cf4c-4343-be8b-d832c45ab51c

Result::

    {
       "ReservedNode": {
          "OfferingType": "Heavy Utilization",
          "FixedPrice": "",
          "NodeType": "dw.hs1.xlarge",
          "ReservedNodeId": "1ba8e2e3-bc01-4d65-b35d-a4a3e931547e",
          "UsagePrice": "",
          "RecurringCharges": [
             {
                "RecurringChargeAmount": "",
                "RecurringChargeFrequency": "Hourly"
             }
          ],
          "NodeCount": 1,
          "State": "payment-pending",
          "StartTime": "2013-02-13T17:08:39.051Z",
          "Duration": 31536000,
          "ReservedNodeOfferingId": "ceb6a579-cf4c-4343-be8b-d832c45ab51c"
       },
       "ResponseMetadata": {
          "RequestId": "01bda7bf-7600-11e2-b605-2568d7396e7f"
       }
    }

