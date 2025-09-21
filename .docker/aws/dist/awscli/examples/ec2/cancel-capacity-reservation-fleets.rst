**To cancel a Capacity Reservation Fleet**

The following ``cancel-capacity-reservation-fleets`` example cancels the specified Capacity Reservation Fleet and the capacity it reserves. When you cancel a Fleet, its status changes to ``cancelled``, and it can no longer create new Capacity Reservations. Additionally, all of the individual Capacity Reservations in the Fleet are cancelled, and the instances that were previously running in the reserved capacity continue to run normally in shared capacity. ::

    aws ec2 cancel-capacity-reservation-fleets \
        --capacity-reservation-fleet-ids crf-abcdef01234567890

Output::

    {
        "SuccessfulFleetCancellations": [
            {
                "CurrentFleetState": "cancelling", 
                "PreviousFleetState": "active", 
                "CapacityReservationFleetId": "crf-abcdef01234567890"
            }
        ], 
        "FailedFleetCancellations": []
    }

For more information about Capacity Reservation Fleets, see `Capacity Reservation Fleets <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/cr-fleets.html>`__ in the *Amazon EC2 User Guide*.