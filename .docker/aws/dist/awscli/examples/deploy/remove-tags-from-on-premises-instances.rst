**To remove tags from one or more on-premises instances**

The following ``remove-tags-from-on-premises-instances`` example disassociates the specified on-premises tags in AWS CodeDeploy from on-premises instances. It does not deregister the on-premises instances in AWS CodeDeploy, nor uninstall the AWS CodeDeploy Agent from the instance, nor remove the on-premises configuration file from the instances, nor delete the IAM users that are associated with the instances. ::

    aws deploy remove-tags-from-on-premises-instances \
        --instance-names AssetTag12010298EX AssetTag23121309EX \
        --tags Key=Name,Value=CodeDeployDemo-OnPrem

This command produces no output.
