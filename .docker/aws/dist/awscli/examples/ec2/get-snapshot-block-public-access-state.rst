**To get the current state of block public access for snapshots**

The following ``get-snapshot-block-public-access-state`` example gets the current state of block public access for snapshots. ::

    aws ec2 get-snapshot-block-public-access-state

Output::

    {
        "State": "block-all-sharing"
    }

For more information, see `Block public access for snapshots <https://docs.aws.amazon.com/ebs/latest/userguide/block-public-access-snapshots.html>`__ in the *Amazon EBS User Guide*.