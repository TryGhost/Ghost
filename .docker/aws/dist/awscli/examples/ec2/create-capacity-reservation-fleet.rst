**To create a Capacity Reservation Fleet**

The following ``create-capacity-reservation-fleet`` example creates a Capacity Reservation Fleet for the instance type specified in the request, up to the specified total target capacity. The number of instances for which the Capacity Reservation Fleet reserves capacity depends on the total target capacity and instance type weights that you specify in the request. Specify the instance types to use and a priority for each of the designated instance types. ::

    aws ec2 create-capacity-reservation-fleet \
    --total-target-capacity 24 \
    --allocation-strategy prioritized \
    --instance-match-criteria open \
    --tenancy default \
    --end-date 2022-12-31T23:59:59.000Z \
    --instance-type-specifications file://instanceTypeSpecification.json

Contents of ``instanceTypeSpecification.json``::

    [
        {
            "InstanceType": "m5.xlarge",
            "InstancePlatform": "Linux/UNIX",
            "Weight": 3.0,
            "AvailabilityZone":"us-east-1a",
            "EbsOptimized": true,
            "Priority" : 1
        }
    ]

Output::

    {
        "Status": "submitted", 
        "TotalFulfilledCapacity": 0.0, 
        "CapacityReservationFleetId": "crf-abcdef01234567890", 
        "TotalTargetCapacity": 24
    }

For more information about Capacity Reservation Fleets, see `Capacity Reservation Fleets <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/cr-fleets.html>`__ in the *Amazon EC2 User Guide*. 

For more information about instance type weight and total target capacity, see `Instance type weight <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/crfleet-concepts.html#instance-weight>`__ and `Total target capacity <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/crfleet-concepts.html#target-capacity>`__ in the *Amazon EC2 User Guide*. 

For more information about designating priority for specified instance types, see `Allocation strategy <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/crfleet-concepts.html#allocation-strategy>`__ and `Instance type priority <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/crfleet-concepts.html#instance-priority>`__ in the *Amazon EC2 User Guide*.