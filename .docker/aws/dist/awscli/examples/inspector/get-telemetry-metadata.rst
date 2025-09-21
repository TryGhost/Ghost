**To get the telemetry metadata**

The following ``get-telemetry-metadata`` command generates information about the data that is collected for the assessment run with the ARN of ``arn:aws:inspector:us-west-2:123456789012:target/0-0kFIPusq/template/0-4r1V2mAw/run/0-MKkpXXPE``::

  aws inspector get-telemetry-metadata --assessment-run-arn arn:aws:inspector:us-west-2:123456789012:target/0-0kFIPusq/template/0-4r1V2mAw/run/0-MKkpXXPE

Output::

  {
	"telemetryMetadata": [
	  {
		"count": 2,
		"dataSize": 345,
		"messageType": "InspectorDuplicateProcess"
	  },
	  {
		"count": 3,
		"dataSize": 255,
		"messageType": "InspectorTimeEventMsg"
	  },
	  {
		"count": 4,
		"dataSize": 1082,
		"messageType": "InspectorNetworkInterface"
	  },
	  {
		"count": 2,
		"dataSize": 349,
		"messageType": "InspectorDnsEntry"
	  },
	  {
		"count": 11,
		"dataSize": 2514,
		"messageType": "InspectorDirectoryInfoMsg"
	  },
	  {
		"count": 1,
		"dataSize": 179,
		"messageType": "InspectorTcpV6ListeningPort"
	  },
	  {
		"count": 101,
		"dataSize": 10949,
		"messageType": "InspectorTerminal"
	  },
	  {
		"count": 26,
		"dataSize": 5916,
		"messageType": "InspectorUser"
	  },
	  {
		"count": 282,
		"dataSize": 32148,
		"messageType": "InspectorDynamicallyLoadedCodeModule"
	  },
	  {
		"count": 18,
		"dataSize": 10172,
		"messageType": "InspectorCreateProcess"
	  },
	  {
		"count": 3,
		"dataSize": 8001,
		"messageType": "InspectorProcessPerformance"
	  },
	  {
		"count": 1,
		"dataSize": 360,
		"messageType": "InspectorOperatingSystem"
	  },
	  {
		"count": 6,
		"dataSize": 546,
		"messageType": "InspectorStopProcess"
	  },
	  {
		"count": 1,
		"dataSize": 1553,
		"messageType": "InspectorInstanceMetaData"
	  },
	  {
		"count": 2,
		"dataSize": 434,
		"messageType": "InspectorTcpV4Connection"
	  },
	  {
		"count": 474,
		"dataSize": 2960322,
		"messageType": "InspectorPackageInfo"
	  },
	  {
		"count": 3,
		"dataSize": 2235,
		"messageType": "InspectorSystemPerformance"
	  },
	  {
		"count": 105,
		"dataSize": 46048,
		"messageType": "InspectorCodeModule"
	  },
	  {
		"count": 1,
		"dataSize": 182,
		"messageType": "InspectorUdpV6ListeningPort"
	  },
	  {
		"count": 2,
		"dataSize": 371,
		"messageType": "InspectorUdpV4ListeningPort"
	  },
	  {
		"count": 18,
		"dataSize": 8362,
		"messageType": "InspectorKernelModule"
	  },
	  {
		"count": 29,
		"dataSize": 48788,
		"messageType": "InspectorConfigurationInfo"
	  },
	  {
		"count": 1,
		"dataSize": 79,
		"messageType": "InspectorMonitoringStart"
	  },
	  {
		"count": 5,
		"dataSize": 0,
		"messageType": "InspectorSplitMsgBegin"
	  },
	  {
		"count": 51,
		"dataSize": 4593,
		"messageType": "InspectorGroup"
	  },
	  {
		"count": 1,
		"dataSize": 184,
		"messageType": "InspectorTcpV4ListeningPort"
	  },
	  {
		"count": 1159,
		"dataSize": 3146579,
		"messageType": "Total"
	  },
	  {
		"count": 5,
		"dataSize": 0,
		"messageType": "InspectorSplitMsgEnd"
	  },
	  {
		"count": 1,
		"dataSize": 612,
		"messageType": "InspectorLoadImageInProcess"
	  }
	]
  }

