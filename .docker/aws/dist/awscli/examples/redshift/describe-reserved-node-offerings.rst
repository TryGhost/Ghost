Describe Reserved Node Offerings
--------------------------------

This example shows all of the reserved node offerings that are available for
purchase.

Command::

   aws redshift describe-reserved-node-offerings

Result::

    {
       "ReservedNodeOfferings": [
          {
             "OfferingType": "Heavy Utilization",
             "FixedPrice": "",
             "NodeType": "dw.hs1.xlarge",
             "UsagePrice": "",
             "RecurringCharges": [
                {
                   "RecurringChargeAmount": "",
                   "RecurringChargeFrequency": "Hourly"
                } ],
             "Duration": 31536000,
             "ReservedNodeOfferingId": "ceb6a579-cf4c-4343-be8b-d832c45ab51c"
          },
          {
             "OfferingType": "Heavy Utilization",
             "FixedPrice": "",
             "NodeType": "dw.hs1.8xlarge",
             "UsagePrice": "",
             "RecurringCharges": [
                {
                "RecurringChargeAmount": "",
                "RecurringChargeFrequency": "Hourly"
                } ],
             "Duration": 31536000,
             "ReservedNodeOfferingId": "e5a2ff3b-352d-4a9c-ad7d-373c4cab5dd2"
          },
          ...remaining output omitted...
       ],
       "ResponseMetadata": {
          "RequestId": "8b1a1a43-75ff-11e2-9666-e142fe91ddd1"
       }
    }

If you want to purchase a reserved node offering, you can call ``purchase-reserved-node-offering`` using a valid
*ReservedNodeOfferingId*.

