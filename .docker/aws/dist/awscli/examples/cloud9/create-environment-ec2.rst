**To create an AWS Cloud9 EC2 development environment**

This following ``create-environment-ec2`` example creates an AWS Cloud9 development environment with the specified settings, launches an Amazon Elastic Compute Cloud (Amazon EC2) instance, and then connects from the instance to the environment. ::

    aws cloud9 create-environment-ec2 \
        --name my-demo-env \
        --description "My demonstration development environment." \
        --instance-type t2.micro --image-id amazonlinux-2023-x86_64 \
        --subnet-id subnet-1fab8aEX \
        --automatic-stop-time-minutes 60 \
        --owner-arn arn:aws:iam::123456789012:user/MyDemoUser

Output::

    {
        "environmentId": "8a34f51ce1e04a08882f1e811bd706EX"
    }

For more information, see `Creating an EC2 Environment <https://docs.aws.amazon.com/cloud9/latest/user-guide/create-environment-main.html>`__ in the *AWS Cloud9 User Guide*.