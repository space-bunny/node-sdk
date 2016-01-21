<a name="module_MqttStreamClient"></a>
## MqttStreamClient
A module that exports an MqttStreamClient client
which inherits from the Mqtt base client


* [MqttStreamClient](#module_MqttStreamClient)
    * [~MqttStreamClient](#module_MqttStreamClient..MqttStreamClient)
        * [new MqttStreamClient(opts)](#new_module_MqttStreamClient..MqttStreamClient.MqttStreamClient)
        * [.streamFrom(streamHooks, options)](#module_MqttStreamClient..MqttStreamClient+streamFrom) ⇒

<a name="module_MqttStreamClient..MqttStreamClient"></a>
### MqttStreamClient~MqttStreamClient
**Kind**: inner class of <code>[MqttStreamClient](#module_MqttStreamClient)</code>  

* [~MqttStreamClient](#module_MqttStreamClient..MqttStreamClient)
    * [new MqttStreamClient(opts)](#new_module_MqttStreamClient..MqttStreamClient.MqttStreamClient)
    * [.streamFrom(streamHooks, options)](#module_MqttStreamClient..MqttStreamClient+streamFrom) ⇒

<a name="new_module_MqttStreamClient..MqttStreamClient.MqttStreamClient"></a>
#### new MqttStreamClient(opts)

| Param | Type | Description |
| --- | --- | --- |
| opts | <code>Object</code> | options must contain client and secret for access keys |

<a name="module_MqttStreamClient..MqttStreamClient+streamFrom"></a>
#### mqttStreamClient.streamFrom(streamHooks, options) ⇒
Subscribe to multiple stream hooks

**Kind**: instance method of <code>[MqttStreamClient](#module_MqttStreamClient..MqttStreamClient)</code>  
**Returns**: promise containing the result of multiple subscriptions  

| Param | Type | Description |
| --- | --- | --- |
| streamHooks | <code>Array</code> | Array of objects. Each objects containing { deviceId: {string}, channel: {string}, callback: {func} } |
| options | <code>Object</code> | subscription options |

