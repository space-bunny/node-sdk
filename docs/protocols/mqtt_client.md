<a name="module_MqttClient"></a>
## MqttClient
A module that exports an MqttClient client
which inherits from the SpaceBunny base client


* [MqttClient](#module_MqttClient)
    * [~MqttClient](#module_MqttClient..MqttClient)
        * [new MqttClient(opts)](#new_module_MqttClient..MqttClient.MqttClient)
        * [.onReceive(callback, options)](#module_MqttClient..MqttClient+onReceive) ⇒
        * [.publish(channel, message, opts)](#module_MqttClient..MqttClient+publish) ⇒
        * [.unsubscribe(topics)](#module_MqttClient..MqttClient+unsubscribe) ⇒
        * [.disconnect()](#module_MqttClient..MqttClient+disconnect) ⇒

<a name="module_MqttClient..MqttClient"></a>
### MqttClient~MqttClient
**Kind**: inner class of <code>[MqttClient](#module_MqttClient)</code>  

* [~MqttClient](#module_MqttClient..MqttClient)
    * [new MqttClient(opts)](#new_module_MqttClient..MqttClient.MqttClient)
    * [.onReceive(callback, options)](#module_MqttClient..MqttClient+onReceive) ⇒
    * [.publish(channel, message, opts)](#module_MqttClient..MqttClient+publish) ⇒
    * [.unsubscribe(topics)](#module_MqttClient..MqttClient+unsubscribe) ⇒
    * [.disconnect()](#module_MqttClient..MqttClient+disconnect) ⇒

<a name="new_module_MqttClient..MqttClient.MqttClient"></a>
#### new MqttClient(opts)

| Param | Type | Description |
| --- | --- | --- |
| opts | <code>Object</code> | options must contain api-key or connection options (deviceId and secret) for devices. |

<a name="module_MqttClient..MqttClient+onReceive"></a>
#### mqttClient.onReceive(callback, options) ⇒
Subscribe to input channel

**Kind**: instance method of <code>[MqttClient](#module_MqttClient..MqttClient)</code>  
**Returns**: promise containing the result of the subscription  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | function called every time a message is received passing the current message as argument |
| options | <code>Object</code> | subscription options |

<a name="module_MqttClient..MqttClient+publish"></a>
#### mqttClient.publish(channel, message, opts) ⇒
Publish a message on a specific channel

**Kind**: instance method of <code>[MqttClient](#module_MqttClient..MqttClient)</code>  
**Returns**: a promise containing the result of the operation  

| Param | Type | Description |
| --- | --- | --- |
| channel | <code>String</code> | channel name on which you want to publish a message |
| message | <code>Object/String</code> | the message payload |
| opts | <code>Object</code> | publication options |

<a name="module_MqttClient..MqttClient+unsubscribe"></a>
#### mqttClient.unsubscribe(topics) ⇒
Unsubscribe client from a list of topics

**Kind**: instance method of <code>[MqttClient](#module_MqttClient..MqttClient)</code>  
**Returns**: a promise containing the result of the operation  

| Param | Type | Description |
| --- | --- | --- |
| topics | <code>Object</code> | list of topics { topic: qos, ... } e.g. { topic_1: 1, topic_2: 0 } |

<a name="module_MqttClient..MqttClient+disconnect"></a>
#### mqttClient.disconnect() ⇒
Destroy the connection between the mqtt client and broker

**Kind**: instance method of <code>[MqttClient](#module_MqttClient..MqttClient)</code>  
**Returns**: a promise containing the result of the operation  
