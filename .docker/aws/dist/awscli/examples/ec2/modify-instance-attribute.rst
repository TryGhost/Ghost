**Example 1: To modify the instance type**

The following ``modify-instance-attribute`` example modifies the instance type of the specified instance. The instance must be in the ``stopped`` state. ::

    aws ec2 modify-instance-attribute \
        --instance-id i-1234567890abcdef0 \
        --instance-type "{\"Value\": \"m1.small\"}"

This command produces no output.

**Example 2: To enable enhanced networking on an instance**

The following ``modify-instance-attribute`` example enables enhanced networking for the specified instance. The instance must be in the ``stopped`` state. ::

    aws ec2 modify-instance-attribute \
        --instance-id i-1234567890abcdef0 \
        --sriov-net-support simple

This command produces no output.

**Example 3: To modify the sourceDestCheck attribute**

The following ``modify-instance-attribute`` example sets the ``sourceDestCheck`` attribute of the specified instance to ``true``. The instance must be in a VPC. ::

  aws ec2 modify-instance-attribute --instance-id i-1234567890abcdef0 --source-dest-check "{\"Value\": true}"

This command produces no output.

**Example 4: To modify the deleteOnTermination attribute of the root volume**

The following ``modify-instance-attribute`` example sets the ``deleteOnTermination`` attribute for the root volume of the specified Amazon EBS-backed instance to ``false``. By default, this attribute is ``true`` for the root volume.

Command::

  aws ec2 modify-instance-attribute \
    --instance-id i-1234567890abcdef0 \
    --block-device-mappings "[{\"DeviceName\": \"/dev/sda1\",\"Ebs\":{\"DeleteOnTermination\":false}}]"

This command produces no output.

**Example 5: To modify the user data attached to an instance**

The following ``modify-instance-attribute`` example adds the contents of the file ``UserData.txt`` as the UserData for the specified instance. 

Contents of original file ``UserData.txt``::

    #!/bin/bash
    yum update -y
    service httpd start
    chkconfig httpd on

The contents of the file must be base64 encoded. The first command converts the text file to base64 and saves it as a new file.

Linux/macOS version of the command::

    base64 UserData.txt > UserData.base64.txt

This command produces no output.

Windows version of the command::

    certutil -encode UserData.txt tmp.b64 && findstr /v /c:- tmp.b64 > UserData.base64.txt

Output::

    Input Length = 67
    Output Length = 152
    CertUtil: -encode command completed successfully.
    
Now you can reference that file in the CLI command that follows::

    aws ec2 modify-instance-attribute \
        --instance-id=i-09b5a14dbca622e76 \
        --attribute userData --value fileb://UserData.base64.txt

This command produces no output.

For more information, see `User Data and the AWS CLI <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html#user-data-api-cli>`__ in the *EC2 User Guide*.
