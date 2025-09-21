**To get information about one or more on-premises instances**

The following ``list-on-premises-instances`` example retrieves a list of available on-premises instance names for instances that are registered in AWS CodeDeploy and also have the specified on-premises instance tag associated in AWS CodeDeploy with the instance. ::

    aws deploy list-on-premises-instances \
        --registration-status Registered \
        --tag-filters Key=Name,Value=CodeDeployDemo-OnPrem,Type=KEY_AND_VALUE

Output::

    {
        "instanceNames": [
            "AssetTag12010298EX"
        ]
    }
