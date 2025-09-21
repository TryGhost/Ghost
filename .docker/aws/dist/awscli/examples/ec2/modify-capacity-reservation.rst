**Example 1: To change the number of instances reserved by an existing capacity reservation**

The following ``modify-capacity-reservation`` example changes the number of instances for which the capacity reservation reserves capacity. ::

    aws ec2 modify-capacity-reservation \
        --capacity-reservation-id cr-1234abcd56EXAMPLE \
        --instance-count 5

Output::

    {
        "Return": true
    }

For more information, see `Modify a Capacity Reservation <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/capacity-reservations-modify.html>`__ in the *Amazon EC2 User Guide*.

**Example 2: To change the end date and time for an existing capacity reservation**

The following ``modify-capacity-reservation`` example modifies an existing capacity reservation to end at the specified date and time. ::

    aws ec2 modify-capacity-reservation \
        --capacity-reservation-id cr-1234abcd56EXAMPLE \
        --end-date-type limited \
        --end-date 2019-08-31T23:59:59Z

For more information, see `Modify a Capacity Reservation <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/capacity-reservations-modify.html>`__ in the *Amazon EC2 User Guide*.
