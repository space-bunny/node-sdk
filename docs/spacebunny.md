<a name="module_SpaceBunny"></a>
## SpaceBunny
A module that exports the base SpaceBunny client


* [SpaceBunny](#module_SpaceBunny)
  * [~SpaceBunny](#module_SpaceBunny..SpaceBunny)
    * [new SpaceBunny(opts)](#new_module_SpaceBunny..SpaceBunny_new)
    * [.connection()](#module_SpaceBunny..SpaceBunny+connection) ⇒
    * [.channels()](#module_SpaceBunny..SpaceBunny+channels) ⇒
    * [.deviceId()](#module_SpaceBunny..SpaceBunny+deviceId) ⇒

<a name="module_SpaceBunny..SpaceBunny"></a>
### SpaceBunny~SpaceBunny
**Kind**: inner class of <code>[SpaceBunny](#module_SpaceBunny)</code>  

* [~SpaceBunny](#module_SpaceBunny..SpaceBunny)
  * [new SpaceBunny(opts)](#new_module_SpaceBunny..SpaceBunny_new)
  * [.connection()](#module_SpaceBunny..SpaceBunny+connection) ⇒
  * [.channels()](#module_SpaceBunny..SpaceBunny+channels) ⇒
  * [.deviceId()](#module_SpaceBunny..SpaceBunny+deviceId) ⇒

<a name="new_module_SpaceBunny..SpaceBunny_new"></a>
#### new SpaceBunny(opts)

| Param | Type | Description |
| --- | --- | --- |
| opts | <code>Object</code> | constructor options may contain api-key or connection options |

<a name="module_SpaceBunny..SpaceBunny+connection"></a>
#### spaceBunny.connection() ⇒
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
