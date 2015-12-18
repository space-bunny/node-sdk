<a name="module_AmqpStreamClient"></a>
## AmqpStreamClient
A module that exports an AmqpStreamClient client
which inherits from the Amqp base client


* [AmqpStreamClient](#module_AmqpStreamClient)
    * [~AmqpStreamClient](#module_AmqpStreamClient..AmqpStreamClient)
        * [new AmqpStreamClient(opts)](#new_module_AmqpStreamClient..AmqpStreamClient.AmqpStreamClient)
        * [.streamFrom(streamHooks, options)](#module_AmqpStreamClient..AmqpStreamClient+streamFrom) ⇒

<a name="module_AmqpStreamClient..AmqpStreamClient"></a>
### AmqpStreamClient~AmqpStreamClient
**Kind**: inner class of <code>[AmqpStreamClient](#module_AmqpStreamClient)</code>  

* [~AmqpStreamClient](#module_AmqpStreamClient..AmqpStreamClient)
    * [new AmqpStreamClient(opts)](#new_module_AmqpStreamClient..AmqpStreamClient.AmqpStreamClient)
    * [.streamFrom(streamHooks, options)](#module_AmqpStreamClient..AmqpStreamClient+streamFrom) ⇒

<a name="new_module_AmqpStreamClient..AmqpStreamClient.AmqpStreamClient"></a>
#### new AmqpStreamClient(opts)

| Param | Type | Description |
| --- | --- | --- |
| opts | <code>Object</code> | options must contain client and secret for access keys |

<a name="module_AmqpStreamClient..AmqpStreamClient+streamFrom"></a>
#### amqpStreamClient.streamFrom(streamHooks, options) ⇒
Subscribe to multiple stream hooks

**Kind**: instance method of <code>[AmqpStreamClient](#module_AmqpStreamClient..AmqpStreamClient)</code>  
**Returns**: promise containing the result of multiple subscriptions  

| Param | Type | Description |
| --- | --- | --- |
| streamHooks | <code>Array</code> | Array of objects. Each objects containing { deviceId: {string}, channel: {string}, callback: {func} } |
| options | <code>Object</code> | subscription options |

