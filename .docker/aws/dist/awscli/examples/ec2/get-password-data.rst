**To get the encrypted password**

This example gets the encrypted password.

Command::

  aws ec2 get-password-data --instance-id i-1234567890abcdef0

Output::

  {
      "InstanceId": "i-1234567890abcdef0",
      "Timestamp": "2013-08-07T22:18:38.000Z",
      "PasswordData": "gSlJFq+VpcZXqy+iktxMF6NyxQ4qCrT4+gaOuNOenX1MmgXPTj7XEXAMPLE
  UQ+YeFfb+L1U4C4AKv652Ux1iRB3CPTYP7WmU3TUnhsuBd+p6LVk7T2lKUml6OXbk6WPW1VYYm/TRPB1
  e1DQ7PY4an/DgZT4mwcpRFigzhniQgDDeO1InvSDcwoUTwNs0Y1S8ouri2W4n5GNlriM3Q0AnNVelVz/
  53TkDtxbNoU606M1gK9zUWSxqEgwvbV2j8c5rP0WCuaMWSFl4ziDu4bd7q+4RSyi8NUsVWnKZ4aEZffu
  DPGzKrF5yLlf3etP2L4ZR6CvG7K1hx7VKOQVN32Dajw=="
  }

**To get the decrypted password**

This example gets the decrypted password.

Command::

  aws ec2 get-password-data --instance-id  i-1234567890abcdef0 --priv-launch-key C:\Keys\MyKeyPair.pem

Output::

  {
      "InstanceId": "i-1234567890abcdef0",
      "Timestamp": "2013-08-30T23:18:05.000Z",
      "PasswordData": "&ViJ652e*u"
  }

