**To delete a subnet CIDR reservation**

The following ``delete-subnet-cidr-reservation`` example deletes the specified subnet CIDR reservation. ::

    aws ec2 delete-subnet-cidr-reservation \
        --subnet-cidr-reservation-id scr-044f977c4eEXAMPLE

Output::

    {
        "DeletedSubnetCidrReservation": {
            "SubnetCidrReservationId": "scr-044f977c4eEXAMPLE",
            "SubnetId": "subnet-03c51e2e6cEXAMPLE",
            "Cidr": "10.1.0.16/28",
            "ReservationType": "prefix",
            "OwnerId": "123456789012"
        }
    }

For more information, see `Subnet CIDR reservations <https://docs.aws.amazon.com/vpc/latest/userguide/subnet-cidr-reservation.html>`__ in the *Amazon VPC User Guide*.