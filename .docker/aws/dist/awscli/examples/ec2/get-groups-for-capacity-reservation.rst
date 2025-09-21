**To list the resource groups with a Capacity Reservation**

The following ``get-groups-for-capacity-reservation`` example lists the resource groups to which the specified Capacity Reservation was added. ::

    aws ec2 get-groups-for-capacity-reservation \
        --capacity-reservation-id cr-1234abcd56EXAMPLE

Output::

    {
        "CapacityReservationsGroup": [
            {
                "GroupArn": "arn:aws:resource-groups:us-west-2:123456789012:group/my-resource-group",
                "OwnerId": "123456789012"
            }
        ]
    }

For more information, see `Capacity Reservation groups <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-cr-group.html>`__ in the *Amazon EC2 User Guide*.
