**To view a Capacity Reservation Fleet**

The following ``describe-capacity-reservation-fleets`` example lists configuration and capacity information for the specified Capacity Reservation Fleet. It also lists details about the individual Capacity Reservations that are inside the Fleet. ::

    aws ec2 describe-capacity-reservation-fleets \
        --capacity-reservation-fleet-ids crf-abcdef01234567890

Output::

    {
        "CapacityReservationFleets": [
            {
                "State": "active", 
                "EndDate": "2022-12-31T23:59:59.000Z", 
                "InstanceMatchCriteria": "open", 
                "Tags": [], 
                "CapacityReservationFleetId": "crf-abcdef01234567890", 
                "Tenancy": "default", 
                "InstanceTypeSpecifications": [
                    {
                        "CapacityReservationId": "cr-1234567890abcdef0", 
                        "AvailabilityZone": "us-east-1a", 
                        "FulfilledCapacity": 5.0, 
                        "Weight": 1.0, 
                        "CreateDate": "2022-07-02T08:34:33.398Z", 
                        "InstancePlatform": "Linux/UNIX", 
                        "TotalInstanceCount": 5, 
                        "Priority": 1, 
                        "EbsOptimized": true, 
                        "InstanceType": "m5.xlarge"
                    }
                ], 
                "TotalTargetCapacity": 5, 
                "TotalFulfilledCapacity": 5.0, 
                "CreateTime": "2022-07-02T08:34:33.397Z", 
                "AllocationStrategy": "prioritized"
            }
        ]
    }

For more information about Capacity Reservation Fleets, see `Capacity Reservation Fleets <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/cr-fleets.html>`__ in the *Amazon EC2 User Guide*.
