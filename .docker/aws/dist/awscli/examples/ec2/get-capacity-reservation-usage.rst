**To view capacity reservation usage across AWS accounts**

The following ``get-capacity-reservation-usage`` example displays usage information for the specified capacity reservation. ::

    aws ec2 get-capacity-reservation-usage \
        --capacity-reservation-id cr-1234abcd56EXAMPLE

Output::

    {
        "CapacityReservationId": "cr-1234abcd56EXAMPLE ",
        "InstanceUsages": [
            {
                "UsedInstanceCount": 1,
                "AccountId": "123456789012"
            }
        ],
        "AvailableInstanceCount": 4,
        "TotalInstanceCount": 5,
        "State": "active",
        "InstanceType": "t2.medium"
    }

For more information, see `Shared Capacity Reservations <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/capacity-reservation-sharing.html>`__ in the *Amazon EC2 User Guide*.
