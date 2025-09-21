**To enable block public access for snapshots**

The following ``enable-snapshot-block-public-access`` example blocks all public sharing of your snapshots. ::

    aws ec2 enable-snapshot-block-public-access \
        --state block-all-sharing

Output::

    {
        "State": "block-all-sharing"
    }

For more information, see `Block public access for snapshots <https://docs.aws.amazon.com/ebs/latest/userguide/block-public-access-snapshots.html>`__ in the *Amazon EBS User Guide*.