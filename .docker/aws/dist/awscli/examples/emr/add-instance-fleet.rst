**To add a task instance fleet to a cluster**

This example adds a new task instance fleet to the cluster specified.

Command::

  aws emr add-instance-fleet --cluster-id 'j-12ABCDEFGHI34JK' --instance-fleet  InstanceFleetType=TASK,TargetSpotCapacity=1,LaunchSpecifications={SpotSpecification='{TimeoutDurationMinutes=20,TimeoutAction=TERMINATE_CLUSTER}'},InstanceTypeConfigs=['{InstanceType=m3.xlarge,BidPrice=0.5}']

Output::

  {
     "ClusterId": "j-12ABCDEFGHI34JK",
     "InstanceFleetId": "if-23ABCDEFGHI45JJ"
  }
