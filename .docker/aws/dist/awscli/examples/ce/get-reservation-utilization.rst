**To retrieve the reservation utilization for your account**

The following ``get-reservation-utilization`` example retrieves the RI utilization for all t2.nano instance types from 2018-03-01 to 2018-08-01 for the account. ::

    aws ce get-reservation-utilization \
        --time-period Start=2018-03-01,End=2018-08-01 \
        --filter file://filters.json

Contents of ``filters.json``::

    {
        "Dimensions": {
            "Key": "INSTANCE_TYPE",
            "Values": [
                "t2.nano"
            ]
        }
    }

Output::

    {
        "Total": {
            "TotalAmortizedFee": "0",
            "UtilizationPercentage": "0",
            "PurchasedHours": "0",
            "NetRISavings": "0",
            "TotalActualHours": "0",
            "AmortizedRecurringFee": "0",
            "UnusedHours": "0",
            "TotalPotentialRISavings": "0",
            "OnDemandCostOfRIHoursUsed": "0",
            "AmortizedUpfrontFee": "0"
        },
        "UtilizationsByTime": []
    }
