**To get information about a subnet CIDR reservation**

The following ``get-subnet-cidr-reservations`` example displays information about the specified subnet CIDR reservation. ::

    aws ec2 get-subnet-cidr-reservations \
        --subnet-id subnet-03c51e2e6cEXAMPLE

Output::

    {
        "SubnetIpv4CidrReservations": [
            {
                "SubnetCidrReservationId": "scr-044f977c4eEXAMPLE",
                "SubnetId": "subnet-03c51e2e6cEXAMPLE",
                "Cidr": "10.1.0.16/28",
                "ReservationType": "prefix",
                "OwnerId": "123456789012"
            }
        ],
        "SubnetIpv6CidrReservations": []
    }

For more information, see `Subnet CIDR reservations <https://docs.aws.amazon.com/vpc/latest/userguide/subnet-cidr-reservation.html>`__ in the *Amazon VPC User Guide*.