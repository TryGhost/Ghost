**To get a quote for exchanging a Convertible Reserved Instance**

This example gets the exchange information for the specified Convertible Reserved Instances.

Command::

  aws ec2 get-reserved-instances-exchange-quote --reserved-instance-ids 7b8750c3-397e-4da4-bbcb-a45ebexample --target-configurations OfferingId=6fea5434-b379-434c-b07b-a7abexample

Output::

  {
    "CurrencyCode": "USD", 
    "ReservedInstanceValueSet": [
        {
            "ReservedInstanceId": "7b8750c3-397e-4da4-bbcb-a45ebexample", 
            "ReservationValue": {
                "RemainingUpfrontValue": "0.000000", 
                "HourlyPrice": "0.027800", 
                "RemainingTotalValue": "730.556200"
            }
        }
    ], 
    "PaymentDue": "424.983828", 
    "TargetConfigurationValueSet": [
        {
            "TargetConfiguration": {
                "InstanceCount": 5, 
                "OfferingId": "6fea5434-b379-434c-b07b-a7abexample"
            }, 
            "ReservationValue": {
                "RemainingUpfrontValue": "424.983828", 
                "HourlyPrice": "0.016000", 
                "RemainingTotalValue": "845.447828"
            }
        }
    ], 
    "IsValidExchange": true, 
    "OutputReservedInstancesWillExpireAt": "2020-10-01T13:03:39Z", 
    "ReservedInstanceValueRollup": {
        "RemainingUpfrontValue": "0.000000", 
        "HourlyPrice": "0.027800", 
        "RemainingTotalValue": "730.556200"
    }, 
    "TargetConfigurationValueRollup": {
        "RemainingUpfrontValue": "424.983828", 
        "HourlyPrice": "0.016000", 
        "RemainingTotalValue": "845.447828"
    }
  }
