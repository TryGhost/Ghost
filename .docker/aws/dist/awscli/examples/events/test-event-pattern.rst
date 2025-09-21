**To check whether an event pattern matches a specified event**

This example tests whether the pattern "source:com.mycompany.myapp" matches the specified event. In this example, the output would be "true"::

  aws events test-event-pattern --event-pattern "{\"source\":[\"com.mycompany.myapp\"]}" --event "{\"id\":\"1\",\"source\":\"com.mycompany.myapp\",\"detail-type\":\"myDetailType\",\"account\":\"123456789012\",\"region\":\"us-east-1\",\"time\":\"2017-04-11T20:11:04Z\"}"
