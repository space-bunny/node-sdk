<a name="module_SpaceBunny"></a>

## SpaceBunny
A module that exports the base SpaceBunny client


* [SpaceBunny](#module_SpaceBunny)
    * [~SpaceBunny](#module_SpaceBunny..SpaceBunny)
        * [new SpaceBunny(opts)](#new_module_SpaceBunny..SpaceBunny_new)
        * [.getConnectionParams()](#module_SpaceBunny..SpaceBunny+getConnectionParams) ⇒
        * [.channels()](#module_SpaceBunny..SpaceBunny+channels) ⇒
        * [.deviceId()](#module_SpaceBunny..SpaceBunny+deviceId) ⇒
        * [.liveStreamByName(streamName)](#module_SpaceBunny..SpaceBunny+liveStreamByName) ⇒

<a name="module_SpaceBunny..SpaceBunny"></a>

### SpaceBunny~SpaceBunny
**Kind**: inner class of <code>[SpaceBunny](#module_SpaceBunny)</code>  

* [~SpaceBunny](#module_SpaceBunny..SpaceBunny)
    * [new SpaceBunny(opts)](#new_module_SpaceBunny..SpaceBunny_new)
    * [.getConnectionParams()](#module_SpaceBunny..SpaceBunny+getConnectionParams) ⇒
    * [.channels()](#module_SpaceBunny..SpaceBunny+channels) ⇒
    * [.deviceId()](#module_SpaceBunny..SpaceBunny+deviceId) ⇒
    * [.liveStreamByName(streamName)](#module_SpaceBunny..SpaceBunny+liveStreamByName) ⇒

<a name="new_module_SpaceBunny..SpaceBunny_new"></a>

#### new SpaceBunny(opts)

| Param | Type | Description |
| --- | --- | --- |
| opts | <code>Object</code> | constructor options may contain api-key or connection options |

<a name="module_SpaceBunny..SpaceBunny+getConnectionParams"></a>

#### spaceBunny.getConnectionParams() ⇒
Check if api-key or connection parameters have already been passed
If at least api-key is passed ask the endpoint for the configurations
else if also connection parameters are not passed raise an exception

**Kind**: instance method of <code>[SpaceBunny](#module_SpaceBunny..SpaceBunny)</code>  
**Returns**: an Object containing the connection parameters  
<a name="module_SpaceBunny..SpaceBunny+channels"></a>

#### spaceBunny.channels() ⇒
**Kind**: instance method of <code>[SpaceBunny](#module_SpaceBunny..SpaceBunny)</code>  
**Returns**: all channels configured for the current device  
<a name="module_SpaceBunny..SpaceBunny+deviceId"></a>

#### spaceBunny.deviceId() ⇒
**Kind**: instance method of <code>[SpaceBunny](#module_SpaceBunny..SpaceBunny)</code>  
**Returns**: the device ID for the current device  
<a name="module_SpaceBunny..SpaceBunny+liveStreamByName"></a>

#### spaceBunny.liveStreamByName(streamName) ⇒
Return a Stream ID from a stream name given in input

**Kind**: instance method of <code>[SpaceBunny](#module_SpaceBunny..SpaceBunny)</code>  
**Returns**: the stream ID which corresponds to the input stream name  

| Param | Type | Description |
| --- | --- | --- |
| streamName | <code>String</code> | stream name |

