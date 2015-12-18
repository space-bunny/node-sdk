<a name="module_StompClient"></a>
## StompClient
A module that exports an StompClient client
which inherits from the SpaceBunny base client


* [StompClient](#module_StompClient)
    * [~StompClient](#module_StompClient..StompClient)
        * [new StompClient(opts)](#new_module_StompClient..StompClient.StompClient)
        * [.onReceive(callback, options)](#module_StompClient..StompClient+onReceive) ⇒
        * [.publish(channel, message, opts)](#module_StompClient..StompClient+publish) ⇒
        * [.disconnect()](#module_StompClient..StompClient+disconnect) ⇒

<a name="module_StompClient..StompClient"></a>
### StompClient~StompClient
**Kind**: inner class of <code>[StompClient](#module_StompClient)</code>  

* [~StompClient](#module_StompClient..StompClient)
    * [new StompClient(opts)](#new_module_StompClient..StompClient.StompClient)
    * [.onReceive(callback, options)](#module_StompClient..StompClient+onReceive) ⇒
    * [.publish(channel, message, opts)](#module_StompClient..StompClient+publish) ⇒
    * [.disconnect()](#module_StompClient..StompClient+disconnect) ⇒

<a name="new_module_StompClient..StompClient.StompClient"></a>
#### new StompClient(opts)

| Param | Type | Description |
| --- | --- | --- |
| opts | <code>Object</code> | options must contain api-key or connection options (deviceId and secret) for devices. |

<a name="module_StompClient..StompClient+onReceive"></a>
#### stompClient.onReceive(callback, options) ⇒
Subscribe to input channel

**Kind**: instance method of <code>[StompClient](#module_StompClient..StompClient)</code>  
**Returns**: promise containing the result of the subscription  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | function called every time a message is received passing the current message as argument |
| options | <code>Object</code> | subscription options |

<a name="module_StompClient..StompClient+publish"></a>
#### stompClient.publish(channel, message, opts) ⇒
Publish a message on a specific channel

**Kind**: instance method of <code>[StompClient](#module_StompClient..StompClient)</code>  
**Returns**: a promise containing the result of the operation  

| Param | Type | Description |
| --- | --- | --- |
| channel | <code>String</code> | channel name on which you want to publish a message |
| message | <code>Object</code> | the message payload |
| opts | <code>Object</code> | publication options |

<a name="module_StompClient..StompClient+disconnect"></a>
#### stompClient.disconnect() ⇒
Destroy the connection between the stomp client and broker

**Kind**: instance method of <code>[StompClient](#module_StompClient..StompClient)</code>  
**Returns**: a promise containing the result of the operation  
