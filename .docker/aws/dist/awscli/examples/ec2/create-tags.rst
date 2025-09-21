**Example 1: To add a tag to a resource**

The following ``create-tags`` example adds the tag ``Stack=production`` to the specified image, or overwrites an existing tag for the AMI where the tag key is ``Stack``. ::

    aws ec2 create-tags \
        --resources ami-1234567890abcdef0 \
        --tags Key=Stack,Value=production

This command produces no output

**Example 2: To add tags to multiple resources**

The following ``create-tags`` example adds (or overwrites) two tags for an AMI and an instance. One of the tags has a key (``webserver``) but no value (value is set to an empty string). The other tag has a key (``stack``) and a value (``Production``). ::

    aws ec2 create-tags \
        --resources ami-1a2b3c4d i-1234567890abcdef0 \
        --tags Key=webserver,Value=   Key=stack,Value=Production

This command produces no output

**Example 3: To add tags containing special characters**

The following ``create-tags`` examples add the tag ``[Group]=test`` for an instance. The square brackets ([ and ]) are special characters, and must be escaped. The following examples also use the line continuation character appropriate for each environment.

If you are using Windows, surround the element that has special characters with double quotes ("), and then precede each double quote character with a backslash (\\) as follows. ::

    aws ec2 create-tags ^
        --resources i-1234567890abcdef0 ^
        --tags Key=\"[Group]\",Value=test

If you are using Windows PowerShell, surround the element the value that has special characters with double quotes ("), precede each double quote character with a backslash (\\), and then surround the entire key and value structure with single quotes (') as follows. ::

    aws ec2 create-tags `
        --resources i-1234567890abcdef0 `
        --tags 'Key=\"[Group]\",Value=test'

If you are using Linux or OS X, surround the element that has special characters with double quotes ("), and then surround the entire key and value structure with single quotes (') as follows. ::

    aws ec2 create-tags \
        --resources i-1234567890abcdef0 \
        --tags 'Key="[Group]",Value=test'

For more information, see `Tag your Amazon EC2 resources <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_Tags.html>`__ in the *Amazon EC2 User Guide*.