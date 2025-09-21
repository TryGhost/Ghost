**To list the images in the Recycle Bin**

The following ``list-images-in-recycle-bin`` example lists all of the images that are currently retained in the Recycle Bin. ::

    aws ec2 list-images-in-recycle-bin

Output::

    {
        "Images": [
            {
                "RecycleBinEnterTime": "2022-03-14T15:35:08.000Z", 
                "Description": "Monthly AMI One", 
                "RecycleBinExitTime": "2022-03-15T15:35:08.000Z", 
                "Name": "AMI_01", 
                "ImageId": "ami-0111222333444abcd"
            }
        ]
    }

For more information, see `Recover deleted AMIs from the Recycle Bin <https://docs.aws.amazon.com/ebs/latest/userguide/recycle-bin-working-with-amis.html>`__ in the *Amazon EBS User Guide*.
