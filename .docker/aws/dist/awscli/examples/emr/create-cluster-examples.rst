Most of the following examples assume that you specified your Amazon EMR service role and Amazon EC2 instance profile. If you have not done this, you must specify each required IAM role or use the ``--use-default-roles`` parameter when creating your cluster. For more information about specifying IAM roles, see `Configure IAM Roles for Amazon EMR Permissions to AWS Services <https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-iam-roles.html>`_ in the *Amazon EMR Management Guide*.

**Example 1: To create a cluster**

The following ``create-cluster`` example creates a simple EMR cluster. ::

    aws emr create-cluster \
        --release-label emr-5.14.0 \
        --instance-type m4.large \
        --instance-count 2

This command produces no output.

**Example 2: To create an Amazon EMR cluster with default ServiceRole and InstanceProfile roles**

The following ``create-cluster`` example creates an Amazon EMR cluster that uses the ``--instance-groups`` configuration. ::

    aws emr create-cluster \
        --release-label emr-5.14.0 \
        --service-role EMR_DefaultRole \
        --ec2-attributes InstanceProfile=EMR_EC2_DefaultRole \
        --instance-groups InstanceGroupType=MASTER,InstanceCount=1,InstanceType=m4.large InstanceGroupType=CORE,InstanceCount=2,InstanceType=m4.large

**Example 3: To create an Amazon EMR cluster that uses an instance fleet**

The following ``create-cluster`` example creates an Amazon EMR cluster that uses the ``--instance-fleets`` configuration, specifying two instance types for each fleet and two EC2 Subnets. ::

    aws emr create-cluster \
        --release-label emr-5.14.0 \
        --service-role EMR_DefaultRole \
        --ec2-attributes InstanceProfile=EMR_EC2_DefaultRole,SubnetIds=['subnet-ab12345c','subnet-de67890f'] \
        --instance-fleets InstanceFleetType=MASTER,TargetOnDemandCapacity=1,InstanceTypeConfigs=['{InstanceType=m4.large}'] InstanceFleetType=CORE,TargetSpotCapacity=11,InstanceTypeConfigs=['{InstanceType=m4.large,BidPrice=0.5,WeightedCapacity=3}','{InstanceType=m4.2xlarge,BidPrice=0.9,WeightedCapacity=5}'],LaunchSpecifications={SpotSpecification='{TimeoutDurationMinutes=120,TimeoutAction=SWITCH_TO_ON_DEMAND}'}

**Example 4: To create a cluster with default roles**

The following ``create-cluster`` example uses the ``--use-default-roles`` parameter to specify the default service role and instance profile. ::

    aws emr create-cluster \
        --release-label emr-5.9.0 \
        --use-default-roles \
        --instance-groups InstanceGroupType=MASTER,InstanceCount=1,InstanceType=m4.large InstanceGroupType=CORE,InstanceCount=2,InstanceType=m4.large \
        --auto-terminate

**Example 5: To create a cluster and specify the applications to install**

The following ``create-cluster`` example uses the ``--applications`` parameter to specify the applications that Amazon EMR installs. This example installs Hadoop, Hive and Pig. ::

    aws emr create-cluster \
        --applications Name=Hadoop Name=Hive Name=Pig \
        --release-label emr-5.9.0 \
        --instance-groups InstanceGroupType=MASTER,InstanceCount=1,InstanceType=m4.large InstanceGroupType=CORE,InstanceCount=2,InstanceType=m4.large \
        --auto-terminate

**Example 6: To create a cluster that includes Spark**

The following example installs Spark. ::

    aws emr create-cluster \
        --release-label emr-5.9.0 \
        --applications Name=Spark \
        --ec2-attributes KeyName=myKey \
        --instance-groups InstanceGroupType=MASTER,InstanceCount=1,InstanceType=m4.large InstanceGroupType=CORE,InstanceCount=2,InstanceType=m4.large \
        --auto-terminate

**Example 7: To specify a custom AMI to use for cluster instances**

The following ``create-cluster`` example creates a cluster instance based on the Amazon Linux AMI with ID ``ami-a518e6df``. ::

    aws emr create-cluster \
        --name "Cluster with My Custom AMI" \
        --custom-ami-id ami-a518e6df \
        --ebs-root-volume-size 20 \
        --release-label emr-5.9.0 \
        --use-default-roles \
        --instance-count 2 \
        --instance-type m4.large

**Example 8: To customize application configurations**

The following examples use the ``--configurations`` parameter to specify a JSON configuration file that contains application customizations for Hadoop. For more information, see `Configuring Applications <https://docs.aws.amazon.com/emr/latest/ReleaseGuide/emr-configure-apps.html>`__ in the *Amazon EMR Release Guide*.

Contents of ``configurations.json``::

    [
        {
           "Classification": "mapred-site",
           "Properties": {
               "mapred.tasktracker.map.tasks.maximum": 2
           }
        },
        {
            "Classification": "hadoop-env",
            "Properties": {},
            "Configurations": [
                {
                    "Classification": "export",
                    "Properties": {
                        "HADOOP_DATANODE_HEAPSIZE": 2048,
                        "HADOOP_NAMENODE_OPTS": "-XX:GCTimeRatio=19"
                    }
                }
            ]
        }
    ]

The following example references ``configurations.json`` as a local file. ::

    aws emr create-cluster \
        --configurations file://configurations.json \
        --release-label emr-5.9.0 \
        --instance-groups InstanceGroupType=MASTER,InstanceCount=1,InstanceType=m4.large InstanceGroupType=CORE,InstanceCount=2,InstanceType=m4.large \
        --auto-terminate

The following example references ``configurations.json`` as a file in Amazon S3. ::

    aws emr create-cluster \
        --configurations https://s3.amazonaws.com/amzn-s3-demo-bucket/configurations.json \
        --release-label emr-5.9.0 \
        --instance-groups InstanceGroupType=MASTER,InstanceCount=1,InstanceType=m4.large InstanceGroupType=CORE,InstanceCount=2,InstanceType=m4.large \
        --auto-terminate

**Example 9: To create a cluster with master, core, and task instance groups**

The following ``create-cluster`` example uses ``--instance-groups`` to specify the type and number of EC2 instances to use for master, core, and task instance groups. ::

    aws emr create-cluster \
        --release-label emr-5.9.0 \
        --instance-groups Name=Master,InstanceGroupType=MASTER,InstanceType=m4.large,InstanceCount=1 Name=Core,InstanceGroupType=CORE,InstanceType=m4.large,InstanceCount=2 Name=Task,InstanceGroupType=TASK,InstanceType=m4.large,InstanceCount=2

**Example 10: To specify that a cluster should terminate after completing all steps**

The following ``create-cluster`` example uses ``--auto-terminate`` to specify that the cluster should shut down automatically after completing all steps. ::

    aws emr create-cluster \
        --release-label emr-5.9.0 \
        --instance-groups InstanceGroupType=MASTER,InstanceCount=1,InstanceType=m4.large  InstanceGroupType=CORE,InstanceCount=2,InstanceType=m4.large \
        --auto-terminate

**Example 11: To specify cluster configuration details such as the Amazon EC2 key pair, network configuration, and security groups**

The following ``create-cluster`` example creates a cluster with the Amazon EC2 key pair named ``myKey`` and a customized instance profile named ``myProfile``. Key pairs are used to authorize SSH connections to cluster nodes, most often the master node. For more information, see `Use an Amazon EC2 Key Pair for SSH Credentials <https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-plan-access-ssh.html>`__ in the *Amazon EMR Management Guide*. ::

    aws emr create-cluster \
        --ec2-attributes KeyName=myKey,InstanceProfile=myProfile \
        --release-label emr-5.9.0 \
        --instance-groups InstanceGroupType=MASTER,InstanceCount=1,InstanceType=m4.large InstanceGroupType=CORE,InstanceCount=2,InstanceType=m4.large \
        --auto-terminate

The following example creates a cluster in an Amazon VPC subnet. ::

    aws emr create-cluster \
        --ec2-attributes SubnetId=subnet-xxxxx \
        --release-label emr-5.9.0 \
        --instance-groups InstanceGroupType=MASTER,InstanceCount=1,InstanceType=m4.large InstanceGroupType=CORE,InstanceCount=2,InstanceType=m4.large \
        --auto-terminate

The following example creates a cluster in the ``us-east-1b`` availability zone. ::

    aws emr create-cluster \
        --ec2-attributes AvailabilityZone=us-east-1b \
        --release-label emr-5.9.0 \
        --instance-groups InstanceGroupType=MASTER,InstanceCount=1,InstanceType=m4.large InstanceGroupType=CORE,InstanceCount=2,InstanceType=m4.large

The following example creates a cluster and specifies only the Amazon EMR-managed security groups. ::

    aws emr create-cluster \
        --release-label emr-5.9.0 \
        --service-role myServiceRole \
        --ec2-attributes InstanceProfile=myRole,EmrManagedMasterSecurityGroup=sg-master1,EmrManagedSlaveSecurityGroup=sg-slave1 \
        --instance-groups InstanceGroupType=MASTER,InstanceCount=1,InstanceType=m4.large InstanceGroupType=CORE,InstanceCount=2,InstanceType=m4.large

The following example creates a cluster and specifies only additional Amazon EC2 security groups. ::

    aws emr create-cluster \
        --release-label emr-5.9.0 \
        --service-role myServiceRole \
        --ec2-attributes InstanceProfile=myRole,AdditionalMasterSecurityGroups=[sg-addMaster1,sg-addMaster2,sg-addMaster3,sg-addMaster4],AdditionalSlaveSecurityGroups=[sg-addSlave1,sg-addSlave2,sg-addSlave3,sg-addSlave4] \
        --instance-groups InstanceGroupType=MASTER,InstanceCount=1,InstanceType=m4.large InstanceGroupType=CORE,InstanceCount=2,InstanceType=m4.large

The following example creates a cluster and specifies the EMR-Managed security groups, as well as additional security groups. ::

    aws emr create-cluster \
        --release-label emr-5.9.0 \
        --service-role myServiceRole \
        --ec2-attributes InstanceProfile=myRole,EmrManagedMasterSecurityGroup=sg-master1,EmrManagedSlaveSecurityGroup=sg-slave1,AdditionalMasterSecurityGroups=[sg-addMaster1,sg-addMaster2,sg-addMaster3,sg-addMaster4],AdditionalSlaveSecurityGroups=[sg-addSlave1,sg-addSlave2,sg-addSlave3,sg-addSlave4] \
        --instance-groups InstanceGroupType=MASTER,InstanceCount=1,InstanceType=m4.large InstanceGroupType=CORE,InstanceCount=2,InstanceType=m4.large

The following example creates a cluster in a VPC private subnet and use a specific Amazon EC2 security group to enable Amazon EMR service access, which is required for clusters in private subnets. ::

    aws emr create-cluster \
        --release-label emr-5.9.0 \
        --service-role myServiceRole \
        --ec2-attributes InstanceProfile=myRole,ServiceAccessSecurityGroup=sg-service-access,EmrManagedMasterSecurityGroup=sg-master,EmrManagedSlaveSecurityGroup=sg-slave \
        --instance-groups InstanceGroupType=MASTER,InstanceCount=1,InstanceType=m4.large InstanceGroupType=CORE,InstanceCount=2,InstanceType=m4.large

The following example specifies security group configuration parameters using a JSON file named ``ec2_attributes.json`` that is stored locally. 
NOTE: JSON arguments must include options and values as their own items in the list. ::

    aws emr create-cluster \
        --release-label emr-5.9.0 \
        --service-role myServiceRole \
        --ec2-attributes file://ec2_attributes.json  \
        --instance-groups InstanceGroupType=MASTER,InstanceCount=1,InstanceType=m4.large InstanceGroupType=CORE,InstanceCount=2,InstanceType=m4.large

Contents of ``ec2_attributes.json``::

    [
        {
            "SubnetId": "subnet-xxxxx",
            "KeyName": "myKey",
            "InstanceProfile":"myRole",
            "EmrManagedMasterSecurityGroup": "sg-master1",
            "EmrManagedSlaveSecurityGroup": "sg-slave1",
            "ServiceAccessSecurityGroup": "sg-service-access",
            "AdditionalMasterSecurityGroups": ["sg-addMaster1","sg-addMaster2","sg-addMaster3","sg-addMaster4"],
            "AdditionalSlaveSecurityGroups": ["sg-addSlave1","sg-addSlave2","sg-addSlave3","sg-addSlave4"]
        }
    ]

**Example 12: To enable debugging and specify a log URI**

The following ``create-cluster`` example uses the ``--enable-debugging`` parameter, which allows you to view log files more easily using the debugging tool in the Amazon EMR console. The ``--log-uri`` parameter is required with ``--enable-debugging``. ::

    aws emr create-cluster \
        --enable-debugging \
        --log-uri s3://amzn-s3-demo-bucket/myLog \
        --release-label emr-5.9.0 \
        --instance-groups InstanceGroupType=MASTER,InstanceCount=1,InstanceType=m4.large InstanceGroupType=CORE,InstanceCount=2,InstanceType=m4.large \
        --auto-terminate

**Example 13: To add tags when creating a cluster**

Tags are key-value pairs that help you identify and manage clusters. The following ``create-cluster`` example uses the ``--tags`` parameter to create three tags for a cluster, one with the key name ``name`` and the value ``Shirley Rodriguez``, a second with the key name ``age`` and the value ``29``, and a third tag with the key name ``department`` and the value ``Analytics``. ::

    aws emr create-cluster \
        --tags name="Shirley Rodriguez" age=29 department="Analytics" \
        --release-label emr-5.32.0 \
        --instance-type m5.xlarge \
        --instance-count 3 \
        --use-default-roles

The following example lists the tags applied to a cluster. ::

    aws emr describe-cluster \
        --cluster-id j-XXXXXXYY \
        --query Cluster.Tags

**Example 14: To use a security configuration that enables encryption and other security features**

The following ``create-cluster`` example uses the ``--security-configuration`` parameter to specify a security configuration for an EMR cluster. You can use security configurations with Amazon EMR version 4.8.0 or later. ::

    aws emr create-cluster \
        --instance-type m4.large \
        --release-label emr-5.9.0 \
        --security-configuration mySecurityConfiguration

**Example 15: To create a cluster with additional EBS storage volumes configured for the instance groups**

When specifying additional EBS volumes, the following arguments are required: ``VolumeType``, ``SizeInGB`` if ``EbsBlockDeviceConfigs`` is specified.

The following ``create-cluster`` example creates a cluster with multiple EBS volumes attached to EC2 instances in the core instance group. ::

    aws emr create-cluster \
        --release-label emr-5.9.0  \
        --use-default-roles \
        --instance-groups InstanceGroupType=MASTER,InstanceCount=1,InstanceType=d2.xlarge 'InstanceGroupType=CORE,InstanceCount=2,InstanceType=d2.xlarge,EbsConfiguration={EbsOptimized=true,EbsBlockDeviceConfigs=[{VolumeSpecification={VolumeType=gp2,SizeInGB=100}},{VolumeSpecification={VolumeType=io1,SizeInGB=100,Iops=100},VolumesPerInstance=4}]}' \
        --auto-terminate

The following example creates a cluster with multiple EBS volumes attached to EC2 instances in the master instance group. ::

    aws emr create-cluster \
        --release-label emr-5.9.0 \
        --use-default-roles \
        --instance-groups 'InstanceGroupType=MASTER, InstanceCount=1, InstanceType=d2.xlarge, EbsConfiguration={EbsOptimized=true, EbsBlockDeviceConfigs=[{VolumeSpecification={VolumeType=io1, SizeInGB=100, Iops=100}},{VolumeSpecification={VolumeType=standard,SizeInGB=50},VolumesPerInstance=3}]}' InstanceGroupType=CORE,InstanceCount=2,InstanceType=d2.xlarge \
        --auto-terminate

**Example 16: To create a cluster with an automatic scaling policy**

You can attach automatic scaling policies to core and task instance groups using Amazon EMR version 4.0 and later. The automatic scaling policy dynamically adds and removes EC2 instances in response to an Amazon CloudWatch metric. For more information, see `Using Automatic Scaling in Amazon EMR` <https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-automatic-scaling.html>`_ in the *Amazon EMR Management Guide*.

When attaching an automatic scaling policy, you must also specify the default role for automatic scaling using ``--auto-scaling-role EMR_AutoScaling_DefaultRole``.

The following ``create-cluster`` example specifies the automatic scaling policy for the ``CORE`` instance group using the ``AutoScalingPolicy`` argument with an embedded JSON structure, which specifies the scaling policy configuration. Instance groups with an embedded JSON structure must have the entire collection of arguments enclosed in single quotes. Using single quotes is optional for instance groups without an embedded JSON structure. ::

    aws emr create-cluster 
        --release-label emr-5.9.0 \
        --use-default-roles --auto-scaling-role EMR_AutoScaling_DefaultRole \
        --instance-groups InstanceGroupType=MASTER,InstanceType=d2.xlarge,InstanceCount=1 'InstanceGroupType=CORE,InstanceType=d2.xlarge,InstanceCount=2,AutoScalingPolicy={Constraints={MinCapacity=1,MaxCapacity=5},Rules=[{Name=TestRule,Description=TestDescription,Action={Market=ON_DEMAND,SimpleScalingPolicyConfiguration={AdjustmentType=EXACT_CAPACITY,ScalingAdjustment=2}},Trigger={CloudWatchAlarmDefinition={ComparisonOperator=GREATER_THAN,EvaluationPeriods=5,MetricName=TestMetric,Namespace=EMR,Period=3,Statistic=MAXIMUM,Threshold=4.5,Unit=NONE,Dimensions=[{Key=TestKey,Value=TestValue}]}}}]}'

The following example uses a JSON file, ``instancegroupconfig.json``, to specify the configuration of all instance groups in a cluster. The JSON file specifies the automatic scaling policy configuration for the core instance group. ::

    aws emr create-cluster \
        --release-label emr-5.9.0 \
        --service-role EMR_DefaultRole \
        --ec2-attributes InstanceProfile=EMR_EC2_DefaultRole \
        --instance-groups file://myfolder/instancegroupconfig.json \
        --auto-scaling-role EMR_AutoScaling_DefaultRole

Contents of ``instancegroupconfig.json``::

    [
        {
            "InstanceCount": 1,
            "Name": "MyMasterIG",
            "InstanceGroupType": "MASTER",
            "InstanceType": "m4.large"
        },
        {
            "InstanceCount": 2,
            "Name": "MyCoreIG",
            "InstanceGroupType": "CORE",
            "InstanceType": "m4.large",
            "AutoScalingPolicy": {
                "Constraints": {
                    "MinCapacity": 2,
                    "MaxCapacity": 10
                },
                "Rules": [
                    {
                        "Name": "Default-scale-out",
                        "Description": "Replicates the default scale-out rule in the console for YARN memory.",
                        "Action": {
                            "SimpleScalingPolicyConfiguration": {
                                "AdjustmentType": "CHANGE_IN_CAPACITY",
                                "ScalingAdjustment": 1,
                                "CoolDown": 300
                            }
                        },
                        "Trigger": {
                            "CloudWatchAlarmDefinition": {
                                "ComparisonOperator": "LESS_THAN",
                                "EvaluationPeriods": 1,
                                "MetricName": "YARNMemoryAvailablePercentage",
                                "Namespace": "AWS/ElasticMapReduce",
                                "Period": 300,
                                "Threshold": 15,
                                "Statistic": "AVERAGE",
                                "Unit": "PERCENT",
                                "Dimensions": [
                                    {
                                        "Key": "JobFlowId",
                                        "Value": "${emr.clusterId}"
                                    }
                                ]
                            }
                        }
                    }
                ]
            }
        }
    ]

**Example 17: Add custom JAR steps when creating a cluster**

The following ``create-cluster`` example adds steps by specifying a JAR file stored in Amazon S3. Steps submit work to a cluster. The main function defined in the JAR file executes after EC2 instances are provisioned, any bootstrap actions have executed, and applications are installed. The steps are specified using ``Type=CUSTOM_JAR``.

Custom JAR steps require the ``Jar=`` parameter, which specifies the path and file name of the JAR. Optional parameters are ``Type``, ``Name``, ``ActionOnFailure``, ``Args``, and ``MainClass``. If main class is not specified, the JAR file should specify ``Main-Class`` in its manifest file. ::

    aws emr create-cluster \
        --steps Type=CUSTOM_JAR,Name=CustomJAR,ActionOnFailure=CONTINUE,Jar=s3://amzn-s3-demo-bucket/mytest.jar,Args=arg1,arg2,arg3 Type=CUSTOM_JAR,Name=CustomJAR,ActionOnFailure=CONTINUE,Jar=s3://amzn-s3-demo-bucket/mytest.jar,MainClass=mymainclass,Args=arg1,arg2,arg3  \
        --release-label emr-5.3.1 \
        --instance-groups InstanceGroupType=MASTER,InstanceCount=1,InstanceType=m4.large InstanceGroupType=CORE,InstanceCount=2,InstanceType=m4.large \
        --auto-terminate

**Example 18: To add streaming steps when creating a cluster**

The following ``create-cluster`` examples add a streaming step to a cluster that terminates after all steps run. Streaming steps require parameters ``Type`` and ``Args``. Streaming steps optional parameters are ``Name`` and ``ActionOnFailure``.

The following example specifies the step inline. ::

    aws emr create-cluster \
        --steps Type=STREAMING,Name='Streaming Program',ActionOnFailure=CONTINUE,Args=[-files,s3://elasticmapreduce/samples/wordcount/wordSplitter.py,-mapper,wordSplitter.py,-reducer,aggregate,-input,s3://elasticmapreduce/samples/wordcount/input,-output,s3://amzn-s3-demo-bucket/wordcount/output] \
        --release-label emr-5.3.1 \
        --instance-groups InstanceGroupType=MASTER,InstanceCount=1,InstanceType=m4.large InstanceGroupType=CORE,InstanceCount=2,InstanceType=m4.large \
        --auto-terminate

The following example uses a locally stored JSON configuration file named ``multiplefiles.json``. The JSON configuration specifies multiple files. To specify multiple files within a step, you must use a JSON configuration file to specify the step. JSON arguments must include options and values as their own items in the list. ::

    aws emr create-cluster \
        --steps file://./multiplefiles.json \
        --release-label emr-5.9.0  \
        --instance-groups InstanceGroupType=MASTER,InstanceCount=1,InstanceType=m4.large InstanceGroupType=CORE,InstanceCount=2,InstanceType=m4.large \
        --auto-terminate

Contents of ``multiplefiles.json``::

    [
        {
            "Name": "JSON Streaming Step",
            "Args": [
                "-files",
                "s3://elasticmapreduce/samples/wordcount/wordSplitter.py",
                "-mapper",
                "wordSplitter.py",
                "-reducer",
                "aggregate",
                "-input",
                "s3://elasticmapreduce/samples/wordcount/input",
                "-output",
                "s3://amzn-s3-demo-bucket/wordcount/output"
            ],
            "ActionOnFailure": "CONTINUE",
            "Type": "STREAMING"
        }
    ]

**Example 19: To add Hive steps when creating a cluster**

The following example add Hive steps when creating a cluster. Hive steps require parameters ``Type`` and ``Args``. Hive steps optional parameters are ``Name`` and ``ActionOnFailure``. ::

    aws emr create-cluster \
        --steps Type=HIVE,Name='Hive program',ActionOnFailure=CONTINUE,ActionOnFailure=TERMINATE_CLUSTER,Args=[-f,s3://elasticmapreduce/samples/hive-ads/libs/model-build.q,-d,INPUT=s3://elasticmapreduce/samples/hive-ads/tables,-d,OUTPUT=s3://amzn-s3-demo-bucket/hive-ads/output/2014-04-18/11-07-32,-d,LIBS=s3://elasticmapreduce/samples/hive-ads/libs] \
        --applications Name=Hive \
        --release-label emr-5.3.1 \
        --instance-groups InstanceGroupType=MASTER,InstanceCount=1,InstanceType=m4.large InstanceGroupType=CORE,InstanceCount=2,InstanceType=m4.large

**Example 20: To add Pig steps when creating a cluster**

The following example adds Pig steps when creating a cluster. Pig steps required parameters are ``Type`` and ``Args``. Pig steps optional parameters are ``Name`` and ``ActionOnFailure``. ::

    aws emr create-cluster \
        --steps Type=PIG,Name='Pig program',ActionOnFailure=CONTINUE,Args=[-f,s3://elasticmapreduce/samples/pig-apache/do-reports2.pig,-p,INPUT=s3://elasticmapreduce/samples/pig-apache/input,-p,OUTPUT=s3://amzn-s3-demo-bucket/pig-apache/output] \
        --applications Name=Pig \
        --release-label emr-5.3.1 \
        --instance-groups InstanceGroupType=MASTER,InstanceCount=1,InstanceType=m4.large InstanceGroupType=CORE,InstanceCount=2,InstanceType=m4.large

**Example 21: To add bootstrap actions**

The following ``create-cluster`` example runs two bootstrap actions defined as scripts that are stored in Amazon S3. ::

    aws emr create-cluster \
        --bootstrap-actions Path=s3://amzn-s3-demo-bucket/myscript1,Name=BootstrapAction1,Args=[arg1,arg2] Path=s3://amzn-s3-demo-bucket/myscript2,Name=BootstrapAction2,Args=[arg1,arg2] \
        --release-label emr-5.3.1 \
        --instance-groups InstanceGroupType=MASTER,InstanceCount=1,InstanceType=m4.large InstanceGroupType=CORE,InstanceCount=2,InstanceType=m4.large \
        --auto-terminate

**Example 22: To enable EMRFS consistent view and customize the RetryCount and RetryPeriod settings**

The following ``create-cluster`` example specifies the retry count and retry period for EMRFS consistent view. The ``Consistent=true`` argument is required. ::

    aws emr create-cluster \
        --instance-type m4.large \
        --release-label emr-5.9.0 \
        --emrfs Consistent=true,RetryCount=6,RetryPeriod=30

The following example specifies the same EMRFS configuration as the previous example, using a locally stored JSON configuration file named ``emrfsconfig.json``. ::

    aws emr create-cluster \
        --instance-type m4.large \
        --release-label emr-5.9.0 \
        --emrfs file://emrfsconfig.json

Contents of ``emrfsconfig.json``::

    {
        "Consistent": true,
        "RetryCount": 6,
        "RetryPeriod": 30
    }

**Example 23: To create a cluster with Kerberos configured**

The following ``create-cluster`` examples create a cluster using a security configuration with Kerberos enabled, and establishes Kerberos parameters for the cluster using ``--kerberos-attributes``.

The following command specifies Kerberos attributes for the cluster inline. ::

    aws emr create-cluster \
        --instance-type m3.xlarge \
        --release-label emr-5.10.0 \
        --service-role EMR_DefaultRole \
        --ec2-attributes InstanceProfile=EMR_EC2_DefaultRole \
        --security-configuration mySecurityConfiguration \
        --kerberos-attributes Realm=EC2.INTERNAL,KdcAdminPassword=123,CrossRealmTrustPrincipalPassword=123

The following command specifies the same attributes, but references a locally stored JSON file named ``kerberos_attributes.json``. In this example, the file is saved in the same directory where you run the command. You can also reference a configuration file saved in Amazon S3. ::

    aws emr create-cluster \
        --instance-type m3.xlarge \
        --release-label emr-5.10.0 \
        --service-role EMR_DefaultRole \
        --ec2-attributes InstanceProfile=EMR_EC2_DefaultRole \
        --security-configuration mySecurityConfiguration \
        --kerberos-attributes file://kerberos_attributes.json

Contents of ``kerberos_attributes.json``::

    {
        "Realm": "EC2.INTERNAL",
        "KdcAdminPassword": "123",
        "CrossRealmTrustPrincipalPassword": "123",
    }

The following ``create-cluster`` example creates an Amazon EMR cluster that uses the ``--instance-groups`` configuration and has a managed scaling policy. ::

    aws emr create-cluster \
        --release-label emr-5.30.0 \
        --service-role EMR_DefaultRole \
        --ec2-attributes InstanceProfile=EMR_EC2_DefaultRole \
        --instance-groups InstanceGroupType=MASTER,InstanceCount=1,InstanceType=m4.large InstanceGroupType=CORE,InstanceCount=2,InstanceType=m4.large
        --managed-scaling-policy ComputeLimits='{MinimumCapacityUnits=2,MaximumCapacityUnits=4,UnitType=Instances}'

The following ``create-cluster`` example creates an Amazon EMR cluster that uses the "--log-encryption-kms-key-id" to define KMS key ID utilized for Log encryption. ::

    aws emr create-cluster \
        --release-label emr-5.30.0 \
        --log-uri s3://amzn-s3-demo-bucket/myLog \
        --log-encryption-kms-key-id arn:aws:kms:us-east-1:110302272565:key/dd559181-283e-45d7-99d1-66da348c4d33 \
        --instance-groups InstanceGroupType=MASTER,InstanceCount=1,InstanceType=m4.large InstanceGroupType=CORE,InstanceCount=2,InstanceType=m4.large

The following ``create-cluster`` example creates an Amazon EMR cluster that uses the "--placement-group-configs" configuration to place master nodes in a high-availability (HA) cluster within an EC2 placement group using ``SPREAD`` placement strategy. ::

    aws emr create-cluster \
        --release-label emr-5.30.0 \
        --service-role EMR_DefaultRole \
        --ec2-attributes InstanceProfile=EMR_EC2_DefaultRole \
        --instance-groups InstanceGroupType=MASTER,InstanceCount=3,InstanceType=m4.largeInstanceGroupType=CORE,InstanceCount=1,InstanceType=m4.large \
        --placement-group-configs InstanceRole=MASTER

The following ``create-cluster`` example creates an Amazon EMR cluster that uses the "--auto-termination-policy" configuration to place an automatic idle termination threshold for the cluster. ::

    aws emr create-cluster \
        --release-label emr-5.34.0 \
        --service-role EMR_DefaultRole \
        --ec2-attributes InstanceProfile=EMR_EC2_DefaultRole \
        --instance-groups InstanceGroupType=MASTER,InstanceCount=1,InstanceType=m4.large InstanceGroupType=CORE,InstanceCount=1,InstanceType=m4.large \
        --auto-termination-policy IdleTimeout=100

The following ``create-cluster`` example creates an Amazon EMR cluster that uses the "--os-release-label" to define an Amazon Linux release for cluster launch ::

    aws emr create-cluster \
        --release-label emr-6.6.0 \
        --os-release-label 2.0.20220406.1 \
        --service-role EMR_DefaultRole \
        --ec2-attributes InstanceProfile=EMR_EC2_DefaultRole \
        --instance-groups InstanceGroupType=MASTER,InstanceCount=1,InstanceType=m4.large InstanceGroupType=CORE,InstanceCount=1,InstanceType=m4.large

**Example 24: To specify an EBS root volume attributes: size, iops and throughput for cluster instances created with EMR releases 6.15.0 and later**

The following ``create-cluster`` example creates an Amazon EMR cluster that uses root volume attributes to configure root volumes specifications for the EC2 instances. ::

    aws emr create-cluster \
        --name "Cluster with My Custom AMI" \
        --custom-ami-id ami-a518e6df \
        --ebs-root-volume-size 20 \
        --ebs-root-volume-iops 3000 \
        --ebs-root-volume-throughput 125 \
        --release-label emr-6.15.0 \
        --use-default-roles \
        --instance-count 2 \
        --instance-type m4.large