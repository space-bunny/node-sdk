<a name="module_AmqpClient"></a>
## AmqpClient
A module that exports an AmqpClient client
which inherits from the SpaceBunny base client


* [AmqpClient](#module_AmqpClient)
    * [~AmqpClient](#module_AmqpClient..AmqpClient)
        * [new AmqpClient(opts)](#new_module_AmqpClient..AmqpClient.AmqpClient)
        * [.onReceive(callback, options)](#module_AmqpClient..AmqpClient+onReceive) ⇒
        * [.publish(channel, message, opts)](#module_AmqpClient..AmqpClient+publish) ⇒
        * [.disconnect()](#module_AmqpClient..AmqpClient+disconnect) ⇒

<a name="module_AmqpClient..AmqpClient"></a>
### AmqpClient~AmqpClient
**Kind**: inner class of <code>[AmqpClient](#module_AmqpClient)</code>  

* [~AmqpClient](#module_AmqpClient..AmqpClient)
    * [new AmqpClient(opts)](#new_module_AmqpClient..AmqpClient.AmqpClient)
    * [.onReceive(callback, options)](#module_AmqpClient..AmqpClient+onReceive) ⇒
    * [.publish(channel, message, opts)](#module_AmqpClient..AmqpClient+publish) ⇒
    * [.disconnect()](#module_AmqpClient..AmqpClient+disconnect) ⇒

<a name="new_module_AmqpClient..AmqpClient.AmqpClient"></a>
#### new AmqpClient(opts)

| Param | Type | Description |
| --- | --- | --- |
| opts | <code>Object</code> | options must contain api-key or connection options (deviceId and secret) for devices. |

<a name="module_AmqpClient..AmqpClient+onReceive"></a>
#### amqpClient.onReceive(callback, options) ⇒
Subscribe to input channel

**Kind**: instance method of <code>[AmqpClient](#module_AmqpClient..AmqpClient)</code>  
**Returns**: promise containing the result of the subscription  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | function called every time a message is received passing the current message as argument |
| options | <code>Object</code> | subscription options |

<a name="module_AmqpClient..AmqpClient+publish"></a>
#### amqpClient.publish(channel, message, opts) ⇒
Publish a message on a specific channel

**Kind**: instance method of <code>[AmqpClient](#module_AmqpClient..AmqpClient)</code>  
**Returns**: promise containing the result of the subscription  

| Param | Type | Description |
| --- | --- | --- |
| channel | <code>String</code> | channel name on which you want to publish a message |
| message | <code>Object</code> | the message payload |
| opts | <code>Object</code> | publication options |

<a name="module_AmqpClient..AmqpClient+disconnect"></a>
#### amqpClient.disconnect() ⇒
Destroy the connection between the amqp client and broker

**Kind**: instance method of <code>[AmqpClient](#module_AmqpClient..AmqpClient)</code>  
**Returns**: a promise containing the result of the operation  
