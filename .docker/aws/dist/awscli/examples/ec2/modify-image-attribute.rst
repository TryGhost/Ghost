**Example 1: To make an AMI public**

The following ``modify-instance-attribute`` example makes the specified AMI public. ::

    aws ec2 modify-image-attribute \
        --image-id ami-5731123e \
        --launch-permission "Add=[{Group=all}]"

This command produces no output.

**Example 2: To make an AMI private**

The following ``modify-instance-attribute`` example makes the specified AMI private. ::

    aws ec2 modify-image-attribute \
        --image-id ami-5731123e \
        --launch-permission "Remove=[{Group=all}]"

This command produces no output.

**Example 3: To grant launch permission to an AWS account**

The following ``modify-instance-attribute`` example grants launch permissions to the specified AWS account. ::

    aws ec2 modify-image-attribute \
        --image-id ami-5731123e \
        --launch-permission "Add=[{UserId=123456789012}]"

This command produces no output.

**Example 4: To remove launch permission from an AWS account**

The following ``modify-instance-attribute`` example removes launch permissions from the specified AWS account. ::

    aws ec2 modify-image-attribute \
        --image-id ami-5731123e \
        --launch-permission "Remove=[{UserId=123456789012}]"

