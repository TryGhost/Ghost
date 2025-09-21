**To disable block public access for snapshots**

The following ``disable-snapshot-block-public-access`` example disables block public access for snapshots to allow public sharing of your snapshots. ::

    aws ec2 disable-snapshot-block-public-access

Output::

    {
        "State": "unblocked"
    }

For more information, see `Block public access for snapshots <https://docs.aws.amazon.com/ebs/latest/userguide/block-public-access-snapshots.html>`__ in the *Amazon EBS User Guide*.
