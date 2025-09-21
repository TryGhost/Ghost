**Example 1: To describe one or more of your capacity reservations**

The following ``describe-capacity-reservations`` example displays details about all of your capacity reservations in the current AWS Region. ::

    aws ec2 describe-capacity-reservations

Output::

    {
        "CapacityReservations": [
            {
                "CapacityReservationId": "cr-1234abcd56EXAMPLE ",
                "OwnerId": "123456789111",
                "CapacityReservationArn": "arn:aws:ec2:us-east-1:123456789111:capacity-reservation/cr-1234abcd56EXAMPLE",
                "AvailabilityZoneId": "use1-az2",
                "InstanceType": "c5.large",
                "InstancePlatform": "Linux/UNIX",
                "AvailabilityZone": "us-east-1a",
                "Tenancy": "default",
                "TotalInstanceCount": 1,
                "AvailableInstanceCount": 1,
                "EbsOptimized": true,
                "EphemeralStorage": false,
                "State": "active",
                "StartDate": "2024-10-23T15:00:24+00:00",
                "EndDateType": "unlimited",
                "InstanceMatchCriteria": "open",
                "CreateDate": "2024-10-23T15:00:24+00:00",
                "Tags": [],
                "CapacityAllocations": []
            },
            {
                "CapacityReservationId": "cr-abcdEXAMPLE9876ef ",
                "OwnerId": "123456789111",
                "CapacityReservationArn": "arn:aws:ec2:us-east-1:123456789111:capacity-reservation/cr-abcdEXAMPLE9876ef",
                "AvailabilityZoneId": "use1-az2",
                "InstanceType": "c4.large",
                "InstancePlatform": "Linux/UNIX",
                "AvailabilityZone": "us-east-1a",
                "Tenancy": "default",
                "TotalInstanceCount": 1,
                "AvailableInstanceCount": 1,
                "EbsOptimized": true,
                "EphemeralStorage": false,
                "State": "cancelled",
                "StartDate": "2024-10-23T15:01:03+00:00",
                "EndDateType": "unlimited",
                "InstanceMatchCriteria": "open",
                "CreateDate": "2024-10-23T15:01:02+00:00",
                "Tags": [],
                "CapacityAllocations": []
            }
        ]
    }

**Example 2: To describe one or more of your capacity reservations**

The following ``describe-capacity-reservations`` example displays details about the specified capacity reservation. ::

    aws ec2 describe-capacity-reservations \
        --capacity-reservation-ids cr-1234abcd56EXAMPLE

Output::

    {
        "CapacityReservations": [
            {
                "CapacityReservationId": "cr-abcdEXAMPLE9876ef ",
                "OwnerId": "123456789111",
                "CapacityReservationArn": "arn:aws:ec2:us-east-1:123456789111:capacity-reservation/cr-abcdEXAMPLE9876ef",
                "AvailabilityZoneId": "use1-az2",
                "InstanceType": "c4.large",
                "InstancePlatform": "Linux/UNIX",
                "AvailabilityZone": "us-east-1a",
                "Tenancy": "default",
                "TotalInstanceCount": 1,
                "AvailableInstanceCount": 1,
                "EbsOptimized": true,
                "EphemeralStorage": false,
                "State": "active",
                "StartDate": "2024-10-23T15:01:03+00:00",
                "EndDateType": "unlimited",
                "InstanceMatchCriteria": "open",
                "CreateDate": "2024-10-23T15:01:02+00:00",
                "Tags": [],
                "CapacityAllocations": []
            }
        ]
    }

For more information, see `Viewing a Capacity Reservation <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/capacity-reservations-using.html#capacity-reservations-view>`__ in the *Amazon Elastic Compute Cloud User Guide for Linux Instances*.
