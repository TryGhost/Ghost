**To import a public key**

First, generate a key pair with the tool of your choice. For example, use this ssh-keygen command:

Command::

  ssh-keygen -t rsa -C "my-key" -f ~/.ssh/my-key

Output::

  Generating public/private rsa key pair.
  Enter passphrase (empty for no passphrase):
  Enter same passphrase again:
  Your identification has been saved in /home/ec2-user/.ssh/my-key.
  Your public key has been saved in /home/ec2-user/.ssh/my-key.pub.
  ...

This example command imports the specified public key.

Command::

  aws ec2 import-key-pair --key-name "my-key" --public-key-material fileb://~/.ssh/my-key.pub
  
Output::

  {
    "KeyName": "my-key",
    "KeyFingerprint": "1f:51:ae:28:bf:89:e9:d8:1f:25:5d:37:2d:7d:b8:ca"
  }
