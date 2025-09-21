**Example 1: To modify the total target capacity of a Capacity Reservation Fleet**

The following ``modify-capacity-reservation-fleet`` example modifies the total target capacity of the specified Capacity Reservation Fleet. When you modify the total target capacity of a Capacity Reservation Fleet, the Fleet automatically creates new Capacity Reservations, or modifies or cancels existing Capacity Reservations in the Fleet to meet the new total target capacity. You can't attempt additional modifications to a Fleet while it is in the ``modifying`` state. ::

    aws ec2 modify-capacity-reservation-fleet \ 
        --capacity-reservation-fleet-id crf-01234567890abcedf \
        --total-target-capacity 160

Output::

    {
        "Return": true
    }

**Example 2: To modify the end date of a Capacity Reservation Fleet**

The following ``modify-capacity-reservation-fleet`` example modifies the end date of the specified Capacity Reservation Fleet. When you modify the end date for the Fleet, the end dates for all of the individual Capacity Reservations are updated accordingly. You can't attempt additional modifications to a Fleet while it is in the ``modifying`` state. ::

    aws ec2 modify-capacity-reservation-fleet \ 
        --capacity-reservation-fleet-id crf-01234567890abcedf \
        --end-date 2022-07-04T23:59:59.000Z

Output::

    {
        "Return": true
    }

For more information about Capacity Reservation Fleets, see `Capacity Reservation Fleets <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/cr-fleets.html>`__ in the *Amazon EC2 User Guide*.