**Example 1: To delete a tag from a resource**

The following ``delete-tags`` example deletes the tag ``Stack=Test`` from the specified image. When you specify both a value and a key name, the tag is deleted only if the tag's value matches the specified value. ::

    aws ec2 delete-tags \
        --resources ami-1234567890abcdef0 \
        --tags Key=Stack,Value=Test

It's optional to specify the value for a tag. The following ``delete-tags`` example deletes the tag with the key name ``purpose`` from the specified instance, regardless of the tag value for the tag. ::

    aws ec2 delete-tags \
        --resources i-1234567890abcdef0 \
        --tags Key=purpose

If you specify the empty string as the tag value, the tag is deleted only if the tag's value is the empty string. The following ``delete-tags`` example specifies the empty string as the tag value for the tag to delete. ::

    aws ec2 delete-tags \
        --resources i-1234567890abcdef0 \
        --tags Key=Name,Value=
  
**Example 2: To delete a tag from multiple resources**
  
The following ``delete-tags`` example deletes the tag``Purpose=Test`` from both an instance and an AMI. As shown in the previous example, you can omit the tag value from the command. ::

    aws ec2 delete-tags \
        --resources i-1234567890abcdef0 ami-1234567890abcdef0 \
        --tags Key=Purpose
