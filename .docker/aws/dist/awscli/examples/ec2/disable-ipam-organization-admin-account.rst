**To disable the delegated IPAM admin**

In certain scenarios, you'll integrate IPAM with AWS Organizations. When you do that, the AWS Organizations management account delegates an AWS Organizations member account as the IPAM admin.

In this example, you are the AWS Organizations management account that delegated the IPAM admin account and you want to disable that account from being the IPAM admin.

You can use any AWS Region for ``--region`` when making this request. You don't have to use the Region where you originally delegated the admin, where the IPAM was created, or an IPAM operating Region. If you disable the delegated admin account, you can re-enable it at any time or delegate a new account as IPAM admin.

The following ``disable-ipam-organization-admin-account`` example disables the delegated IPAM admin in your AWS account. ::

    aws ec2 disable-ipam-organization-admin-account \
        --delegated-admin-account-id 320805250157 \
        --region ap-south-1

Output::

    {
        "Success": true
    }

For more information, see `Integrate IPAM with accounts in an AWS Organization <https://docs.aws.amazon.com/vpc/latest/ipam/enable-integ-ipam.html>`__ in the *Amazon VPC IPAM User Guide*.