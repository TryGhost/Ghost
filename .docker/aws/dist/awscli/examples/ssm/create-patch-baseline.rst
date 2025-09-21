**Example 1: To create a patch baseline with auto-approval**

The following ``create-patch-baseline`` example creates a patch baseline for Windows Server that approves patches for a production environment seven days after they are released by Microsoft. ::

    aws ssm create-patch-baseline \
        --name "Windows-Production-Baseline-AutoApproval" \
        --operating-system "WINDOWS" \
        --approval-rules "PatchRules=[{PatchFilterGroup={PatchFilters=[{Key=MSRC_SEVERITY,Values=[Critical,Important,Moderate]},{Key=CLASSIFICATION,Values=[SecurityUpdates,Updates,UpdateRollups,CriticalUpdates]}]},ApproveAfterDays=7}]" \
        --description "Baseline containing all updates approved for Windows Server production systems"

Output::

    {
        "BaselineId": "pb-045f10b4f3EXAMPLE"
    }
 
**Example 2: To create a patch baseline with an approval cutoff date**

The following ``create-patch-baseline`` example creates a patch baseline for Windows Server that approves all patches for a production environment that are released on or before July 7, 2020. ::

    aws ssm create-patch-baseline \
        --name "Windows-Production-Baseline-AutoApproval" \
        --operating-system "WINDOWS" \
        --approval-rules "PatchRules=[{PatchFilterGroup={PatchFilters=[{Key=MSRC_SEVERITY,Values=[Critical,Important,Moderate]},{Key=CLASSIFICATION,Values=[SecurityUpdates,Updates,UpdateRollups,CriticalUpdates]}]},ApproveUntilDate=2020-07-07}]" \
        --description "Baseline containing all updates approved for Windows Server production systems"

Output::

    {
        "BaselineId": "pb-045f10b4f3EXAMPLE"
    }

**Example 3: To create a patch baseline with approval rules stored in a JSON file**

The following ``create-patch-baseline`` example creates a patch baseline for Amazon Linux 2017.09 that approves patches for a production environment seven days after they are released, specifies approval rules for the patch baseline, and specifies a custom repository for patches.  ::

    aws ssm create-patch-baseline \
        --cli-input-json file://my-amazon-linux-approval-rules-and-repo.json 

Contents of ``my-amazon-linux-approval-rules-and-repo.json``::

    {
        "Name": "Amazon-Linux-2017.09-Production-Baseline",
        "Description": "My approval rules patch baseline for Amazon Linux 2017.09 instances",
        "OperatingSystem": "AMAZON_LINUX",
        "Tags": [
            {
                "Key": "Environment",
                "Value": "Production"
            }
        ],
        "ApprovalRules": {
            "PatchRules": [
                {
                    "ApproveAfterDays": 7,
                    "EnableNonSecurity": true,
                    "PatchFilterGroup": {
                        "PatchFilters": [
                            {
                                "Key": "SEVERITY",
                                "Values": [
                                    "Important",
                                    "Critical"
                                ]
                            },
                            {
                                "Key": "CLASSIFICATION",
                                "Values": [
                                    "Security",
                                    "Bugfix"
                                ]
                            },
                            {
                                "Key": "PRODUCT",
                                "Values": [
                                    "AmazonLinux2017.09"
                                ]
                            }
                        ]
                    }
                }
            ]
        },
        "Sources": [
            {
                "Name": "My-AL2017.09",
                "Products": [
                    "AmazonLinux2017.09"
                ],
                "Configuration": "[amzn-main] \nname=amzn-main-Base\nmirrorlist=http://repo./$awsregion./$awsdomain//$releasever/main/mirror.list //nmirrorlist_expire=300//nmetadata_expire=300 \npriority=10 \nfailovermethod=priority \nfastestmirror_enabled=0 \ngpgcheck=1 \ngpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-amazon-ga \nenabled=1 \nretries=3 \ntimeout=5\nreport_instanceid=yes"
            }
        ]
    }

**Example 4: To create a patch baseline that specifies approved and rejected patches**

The following ``create-patch-baseline`` example explicitly specifies patches to approve and reject as exception to the default approval rules. ::

    aws ssm create-patch-baseline \
        --name "Amazon-Linux-2017.09-Alpha-Baseline" \
        --description "My custom approve/reject patch baseline for Amazon Linux 2017.09 instances" \
        --operating-system "AMAZON_LINUX" \
        --approved-patches "CVE-2018-1234567,example-pkg-EE-2018*.amzn1.noarch" \
        --approved-patches-compliance-level "HIGH" \
        --approved-patches-enable-non-security \
        --tags "Key=Environment,Value=Alpha" 
      
For more information, see `Create a Custom Patch Baseline <https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-patch-baseline-console.html>`__ in the *AWS Systems Manager User Guide*.
