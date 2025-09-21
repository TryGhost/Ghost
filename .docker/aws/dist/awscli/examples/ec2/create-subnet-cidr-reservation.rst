**To create a subnet CIDR reservation**

The following ``create-subnet-cidr-reservation`` example creates a subnet CIDR reservation for the specified subnet and CIDR range. ::

    aws ec2 create-subnet-cidr-reservation \
        --subnet-id subnet-03c51e2eEXAMPLE \
        --reservation-type prefix \
        --cidr 10.1.0.20/26

Output::

    {
        "SubnetCidrReservation": {
            "SubnetCidrReservationId": "scr-044f977c4eEXAMPLE",
            "SubnetId": "subnet-03c51e2e6cEXAMPLE",
            "Cidr": "10.1.0.16/28",
            "ReservationType": "prefix",
            "OwnerId": "123456789012"
        }
    }

For more information, see `Subnet CIDR reservations <https://docs.aws.amazon.com/vpc/latest/userguide/subnet-cidr-reservation.html>`__ in the *Amazon VPC User Guide*.