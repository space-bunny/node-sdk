<a name="module_StompStreamClient"></a>
## StompStreamClient
A module that exports an StompStreamClient client
which inherits from the Stomp base client


* [StompStreamClient](#module_StompStreamClient)
    * [~StompStreamClient](#module_StompStreamClient..StompStreamClient)
        * [new StompStreamClient(opts)](#new_module_StompStreamClient..StompStreamClient.StompStreamClient)
        * [.streamFrom(streamHooks, options)](#module_StompStreamClient..StompStreamClient+streamFrom) ⇒
        * [.unsubscribe(deviceId, channel)](#module_StompStreamClient..StompStreamClient+unsubscribe) ⇒
        * [.disconnect()](#module_StompStreamClient..StompStreamClient+disconnect) ⇒

<a name="module_StompStreamClient..StompStreamClient"></a>
### StompStreamClient~StompStreamClient
**Kind**: inner class of <code>[StompStreamClient](#module_StompStreamClient)</code>  

* [~StompStreamClient](#module_StompStreamClient..StompStreamClient)
    * [new StompStreamClient(opts)](#new_module_StompStreamClient..StompStreamClient.StompStreamClient)
    * [.streamFrom(streamHooks, options)](#module_StompStreamClient..StompStreamClient+streamFrom) ⇒
    * [.unsubscribe(deviceId, channel)](#module_StompStreamClient..StompStreamClient+unsubscribe) ⇒
    * [.disconnect()](#module_StompStreamClient..StompStreamClient+disconnect) ⇒

<a name="new_module_StompStreamClient..StompStreamClient.StompStreamClient"></a>
#### new StompStreamClient(opts)

| Param | Type | Description |
| --- | --- | --- |
| opts | <code>Object</code> | options must contain client and secret for access keys |

<a name="module_StompStreamClient..StompStreamClient+streamFrom"></a>
#### stompStreamClient.streamFrom(streamHooks, options) ⇒
Subscribe to multiple stream hooks

**Kind**: instance method of <code>[StompStreamClient](#module_StompStreamClient..StompStreamClient)</code>  
**Returns**: promise containing the result of multiple subscriptions  

| Param | Type | Description |
| --- | --- | --- |
| streamHooks | <code>Array</code> | Array of objects. Each objects containing { deviceId: {string}, channel: {string}, callback: {func} } |
| options | <code>Object</code> | subscription options |

<a name="module_StompStreamClient..StompStreamClient+unsubscribe"></a>
#### stompStreamClient.unsubscribe(deviceId, channel) ⇒
Unsubscribe client from a topic

**Kind**: instance method of <code>[StompStreamClient](#module_StompStreamClient..StompStreamClient)</code>  
**Returns**: a promise containing the result of the operation  

| Param | Type | Description |
| --- | --- | --- |
| deviceId | <code>String</code> | Device uuid |
| channel | <code>String</code> | channel name |

<a name="module_StompStreamClient..StompStreamClient+disconnect"></a>
#### stompStreamClient.disconnect() ⇒
Destroy the connection between the stomp client and broker

**Kind**: instance method of <code>[StompStreamClient](#module_StompStreamClient..StompStreamClient)</code>  
**Returns**: a promise containing the result of the operation  
