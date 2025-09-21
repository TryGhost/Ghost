**Example 1: To start a Session Manager session**

This ``start-session`` example establishes a connection with an instance for a Session Manager session. Note that this interactive command requires the Session Manager plugin to be installed on the client machine making the call. ::

    aws ssm start-session \
        --target "i-1234567890abcdef0"
  
Output::

    Starting session with SessionId: Jane-Roe-07a16060613c408b5

**Example 2: To start a Session Manager session using SSH**

This ``start-session`` example establishes a connection with an instance for a Session Manager session using SSH. Note that this interactive command requires the Session Manager plugin to be installed on the client machine making the call, and that the command uses the default user on the instance, such as ``ec2-user`` for EC2 instances for Linux. ::

    ssh -i /path/my-key-pair.pem ec2-user@i-02573cafcfEXAMPLE
  
Output::

    Starting session with SessionId: ec2-user-07a16060613c408b5

For more information, see `Start a Session <https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html>`__ and `Install the Session Manager Plugin for the AWS CLI <https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html>`__ in the *AWS Systems Manager User Guide*.
