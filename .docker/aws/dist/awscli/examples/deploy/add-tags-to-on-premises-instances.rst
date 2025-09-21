**To add tags to on-premises instances**

The following ``add-tags-to-on-premises-instances`` example associates in AWS CodeDeploy the same on-premises instance tag to two on-premises instances. It does not register the on-premises instances with AWS CodeDeploy. ::

    aws deploy add-tags-to-on-premises-instances \
        --instance-names AssetTag12010298EX AssetTag23121309EX \
        --tags Key=Name,Value=CodeDeployDemo-OnPrem

This command produces no output.
