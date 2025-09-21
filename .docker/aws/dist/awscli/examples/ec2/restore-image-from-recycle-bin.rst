**To restore an image from the Recycle Bin**

The following ``restore-image-from-recycle-bin`` example restores AMI ami-0111222333444abcd from the Recycle Bin. ::

    aws ec2 restore-image-from-recycle-bin \
        --image-id ami-0111222333444abcd

Output::

    {
        "Return": true
    }

For more information, see `Recover deleted AMIs from the Recycle Bin <https://docs.aws.amazon.com/ebs/latest/userguide/recycle-bin-working-with-amis.html>`__ in the *Amazon EBS User Guide*.
