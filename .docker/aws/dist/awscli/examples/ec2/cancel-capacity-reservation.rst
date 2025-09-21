**To cancel a capacity reservation**

The following ``cancel-capacity-reservation`` example cancels the specified capacity reservation. ::

    aws ec2 cancel-capacity-reservation \
        --capacity-reservation-id cr-1234abcd56EXAMPLE

Output::

    {
        "Return": true
    }

For more information, see `Cancel a Capacity Reservation <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/capacity-reservations-release.html>`__ in the *Amazon EC2 User Guide*.
