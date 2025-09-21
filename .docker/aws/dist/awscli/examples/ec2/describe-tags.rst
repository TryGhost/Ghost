**Example 1: To describe all tags for a single resource**

The following ``describe-tags`` example describes the tags for the specified instance. ::

    aws ec2 describe-tags \
        --filters "Name=resource-id,Values=i-1234567890abcdef8"

Output::

    {
        "Tags": [
            {
                "ResourceType": "instance",
                "ResourceId": "i-1234567890abcdef8",
                "Value": "Test",
                "Key": "Stack"
            },
            {
                "ResourceType": "instance",
                "ResourceId": "i-1234567890abcdef8",
                "Value": "Beta Server",
                "Key": "Name"
            }
        ]
    }

**Example 2: To describe all tags for a resource type**

The following ``describe-tags`` example describes the tags for your volumes. ::

    aws ec2 describe-tags \
        --filters "Name=resource-type,Values=volume"

Output::

    {
        "Tags": [
            {
                "ResourceType": "volume",
                "ResourceId": "vol-1234567890abcdef0",
                "Value": "Project1",
                "Key": "Purpose"
            },
            {
                "ResourceType": "volume",
                "ResourceId": "vol-049df61146c4d7901",
                "Value": "Logs",
                "Key": "Purpose"
            }
        ]
    }

**Example 3: To describe all your tags**

The following ``describe-tags`` example describes the tags for all your resources. ::

    aws ec2 describe-tags

**Example 4: To describe the tags for your resources based on a tag key**

The following ``describe-tags`` example describes the tags for your resources that have a tag with the key ``Stack``. ::

    aws ec2 describe-tags \
        --filters Name=key,Values=Stack

Output::

    {
        "Tags": [
            {
                "ResourceType": "volume",
                "ResourceId": "vol-027552a73f021f3b",
                "Value": "Production",
                "Key": "Stack"
            },
            {
                "ResourceType": "instance",
                "ResourceId": "i-1234567890abcdef8",
                "Value": "Test",
                "Key": "Stack"
            }
        ]
    }

**Example 5: To describe the tags for your resources based on a tag key and tag value**

The following ``describe-tags`` example describes the tags for your resources that have the tag ``Stack=Test``. ::

    aws ec2 describe-tags \
        --filters Name=key,Values=Stack Name=value,Values=Test

Output::

  {
      "Tags": [
          {
              "ResourceType": "image",
              "ResourceId": "ami-3ac336533f021f3bd",
              "Value": "Test",
              "Key": "Stack"
          },
          {
              "ResourceType": "instance",
              "ResourceId": "i-1234567890abcdef8",
              "Value": "Test",
              "Key": "Stack"
          }
      ]
  }

The following ``describe-tags`` example uses alternate syntax to describe resources with the tag ``Stack=Test``. ::

    aws ec2 describe-tags \
        --filters "Name=tag:Stack,Values=Test"

The following ``describe-tags`` example describes the tags for all your instances that have a tag with the key ``Purpose`` and no value. ::

    aws ec2 describe-tags \
        --filters "Name=resource-type,Values=instance" "Name=key,Values=Purpose" "Name=value,Values="

Output::

  {
      "Tags": [
          {
              "ResourceType": "instance", 
              "ResourceId": "i-1234567890abcdef5", 
              "Value": null, 
              "Key": "Purpose"
          }
      ]
  }
