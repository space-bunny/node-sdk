"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/indexNode.ts
var indexNode_exports = {};
__export(indexNode_exports, {
  AmqpClient: () => amqpClient_default,
  AmqpStreamClient: () => amqpStreamClient_default,
  Client: () => amqpClient_default,
  MqttClient: () => mqttClient_default,
  MqttStreamClient: () => mqttStreamClient_default,
  StompClient: () => stompClient_default,
  StompStreamClient: () => stompStreamClient_default,
  StreamClient: () => amqpStreamClient_default
});
module.exports = __toCommonJS(indexNode_exports);

// src/protocols/amqpClient.ts
var amqp = __toESM(require("amqplib"));

// src/utils.ts
function parseContent(message) {
  let parsedMessage = message;
  if (Buffer.isBuffer(parsedMessage)) {
    parsedMessage = parsedMessage.toString("utf-8");
  }
  let res = parsedMessage;
  try {
    res = JSON.parse(parsedMessage);
  } catch (ex) {
    console.error(ex);
  }
  return res;
}
function encapsulateContent(content) {
  let encapsulatedContent;
  try {
    encapsulatedContent = JSON.stringify(content);
  } catch (ex) {
    encapsulatedContent = content.toString();
  }
  return encapsulatedContent;
}
function isNullOrUndefined(value) {
  return value === null || value === void 0;
}
function isDeepStrictEqual(a, b) {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!isDeepStrictEqual(a[key], b[key])) return false;
  }
  return true;
}
function urlJoin(...parts) {
  return parts.map((part, i) => {
    if (i === 0) return part.replace(/\/+$/, "");
    return part.replace(/^\/+/, "").replace(/\/+$/, "");
  }).filter(Boolean).join("/");
}
function camelizeKeys(obj) {
  if (Array.isArray(obj)) return obj.map(camelizeKeys);
  if (obj !== null && typeof obj === "object") {
    return Object.keys(obj).reduce(
      (acc, key) => {
        const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        acc[camelKey] = camelizeKeys(obj[key]);
        return acc;
      },
      {}
    );
  }
  return obj;
}

// src/messages/amqpMessage.ts
var AmqpMessage = class _AmqpMessage {
  /**
   * @constructor
   * @param {Object} message - the message received from the channel
   * @param {String} receiverId - the receiver id
   * @param {Object} opts - subscription options
   */
  constructor(opts) {
    /**
     * Check if a message should be accepted of rejected
     *
     * @return Boolean - true if should be not considered, false otherwise
     */
    this.blackListed = () => {
      if (this.discardMine && this.receiverId === this.senderId && !this.fromApi()) return true;
      if (this.discardFromApi && this.fromApi()) return true;
      return false;
    };
    /**
     * Check if a message comes from API
     * Check if it contains 'x-from-sb-api' header
     *
     * @return Boolean - true if it comes from API, false otherwise
     */
    this.fromApi = () => {
      return !!(this.message?.properties.headers && this.message?.properties.headers[_AmqpMessage.FROM_API_HEADER] === "true");
    };
    this.ack = (opts = {}) => {
      const { allUpTo = false } = opts;
      this.channel.ack(this.message, allUpTo);
    };
    this.nack = (opts = {}) => {
      const { allUpTo = false, requeue = true } = opts;
      this.channel.nack(this.message, allUpTo, requeue);
    };
    this.getContent = () => {
      return this.content;
    };
    this.getProperties = () => {
      return this.message.properties;
    };
    this.getFields = () => {
      return this.message.fields;
    };
    this.getChannelName = () => {
      return this.channelName;
    };
    const { message = void 0, receiverId = "", channel = void 0, subscriptionOpts = {} } = opts;
    const { discardMine = false, discardFromApi = false } = subscriptionOpts;
    this.message = message;
    this.content = parseContent(message ? message.content : "{}");
    this.channel = channel;
    try {
      const [senderId, channelName] = this.message.fields.routingKey.split(".");
      this.senderId = senderId;
      this.channelName = channelName;
    } catch (ex) {
      console.error("Wrong routing key format");
    }
    this.receiverId = receiverId;
    this.discardMine = discardMine;
    this.discardFromApi = discardFromApi;
  }
  static {
    this.FROM_API_HEADER = "x-from-sb-api";
  }
};
var amqpMessage_default = AmqpMessage;

// src/spacebunny.ts
var import_crypto = __toESM(require("crypto"));
var import_events = require("events");
var import_fs = __toESM(require("fs"));
var SpaceBunny = class _SpaceBunny extends import_events.EventEmitter {
  constructor(opts = {}) {
    super();
    this.autoReconnect = true;
    this.reconnectTimeout = 5e3;
    this.verbose = true;
    /**
     * Check if Device-Key or connection parameters have already been passed
     * If at least Device-Key is passed ask the endpoint for the configurations
     * else if also connection parameters are not passed raise an exception
     *
     * @return an Object containing the connection parameters
     */
    this.getEndpointConfigs = async () => {
      if (Object.keys(this.endpointConfigs).length > 0) {
        return this.endpointConfigs;
      }
      try {
        if (this.deviceId && this.secret || this.deviceKey) {
          const hostname = this.generateHostname();
          const uri = urlJoin(hostname, this.endpoint.deviceConfigurationsPath);
          if (this.deviceKey) {
            const response = await fetch(uri, {
              method: "GET",
              headers: {
                "Device-Key": this.deviceKey,
                "Content-Type": "application/json"
              }
            });
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            this.endpointConfigs = camelizeKeys(data);
            this.connectionParams = this.endpointConfigs.connection || {};
            this.channels = this.endpointConfigs.channels || [];
            return this.endpointConfigs;
          }
          if (this.deviceId && this.secret && this.host && this.port && this.vhost) {
            this.connectionParams.protocols = {};
            if (this.tls) {
              this.connectionParams.protocols[this.protocol] = { tlsPort: this.port };
            } else {
              this.connectionParams.protocols[this.protocol] = { port: this.port };
            }
            this.endpointConfigs = {
              connection: this.connectionParams,
              channels: []
            };
            this.manualConfigurations = true;
            return this.endpointConfigs;
          }
        } else if (this.client && this.secret) {
          if (this.host && this.port && this.vhost) {
            this.connectionParams.protocols = {};
            if (this.tls) {
              this.connectionParams.protocols[this.protocol] = { tlsPort: this.port };
            } else {
              this.connectionParams.protocols[this.protocol] = { port: this.port };
            }
            this.endpointConfigs = {
              connection: this.connectionParams,
              liveStreams: []
            };
            this.manualConfigurations = true;
            return this.endpointConfigs;
          }
          const hostname = this.generateHostname();
          const uri = urlJoin(hostname, this.endpoint.liveStreamKeyConfigurationsPath);
          const response = await fetch(uri, {
            method: "GET",
            headers: {
              "Live-Stream-Key-Client": this.client,
              "Live-Stream-Key-Secret": this.secret,
              "Content-Type": "application/json"
            }
          });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const data = await response.json();
          this.endpointConfigs = camelizeKeys(data);
          this.connectionParams = this.endpointConfigs.connection || {};
          this.liveStreams = this.endpointConfigs.liveStreams || [];
          return this.endpointConfigs;
        } else {
          throw new Error("Missing Device Key or wrong connection parameters");
        }
      } catch (error) {
        this.log("error", "Error getting endpoint configurations.");
        throw error;
      }
      return {};
    };
    this.getClassName = () => {
      return this.constructor.name;
    };
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    this.log = (level, message, ...meta) => {
      const msg = message instanceof Error ? message.message : message;
      const prefixedMessage = `${this.getClassName()} - ${msg}`;
      if (this.verbose) {
        this.emit("log", { level, message: prefixedMessage, ...meta });
      }
      if (process.env.NODE_ENV === "development") {
        console.log((/* @__PURE__ */ new Date()).toISOString(), prefixedMessage, ...meta);
      }
    };
    this.isConnected = () => {
      return false;
    };
    this.isStreamClient = () => {
      return this.getClassName().includes("Stream");
    };
    /**
     * @return all channels configured for the current device
     */
    this.getChannels = () => {
      return this.channels || this.endpointConfigs.channels || [];
    };
    /**
     * @return the device ID for the current device
     */
    this.getDeviceId = () => {
      return this.deviceId || this.connectionParams.deviceId;
    };
    /**
     * @return the client for the current stream
     */
    this.getClient = () => {
      return this.client;
    };
    /**
     * @return the Inbox topic for the current device
     */
    this.getInboxTopic = () => {
      return this.inboxTopic;
    };
    /**
     * Return a Stream ID from a stream name given in input
     *
     * @param {String} streamName - stream name
     * @return the stream ID which corresponds to the input stream name
     */
    this.liveStreamByName = (streamName) => {
      const liveStreams = this.liveStreams.filter((stream) => {
        return stream.name === streamName;
      });
      if (liveStreams.length > 0) {
        return liveStreams[0].name || streamName;
      }
      return streamName;
    };
    /**
     * Check if a stream exists
     *
     * @param {String} streamName - stream name
     * @return true if stream exists, false otherwise
     */
    this.liveStreamExists = (streamName) => {
      if (this.manualConfigurations) {
        return true;
      }
      if (isNullOrUndefined(streamName) || streamName.length === 0) {
        return false;
      }
      const liveStreams = this.liveStreams.filter((stream) => {
        return stream.name === streamName;
      });
      return liveStreams.length > 0;
    };
    /**
     * Generate a temporary queue name
     *
     * @private
     * @param {String} prefix - client id or stream name
     * @param {String} suffix - channel name or defaul live stream suffix
     * @param {Numeric} currentTime - current timestamp
     * @return a string that represents the topic name for that channel
     */
    this.tempQueue = (prefix, suffix, currentTime = void 0) => {
      const timestamp = currentTime || (/* @__PURE__ */ new Date()).getTime();
      const deviceId = this.connectionParams.client || this.connectionParams.deviceId;
      return `${import_crypto.default.randomUUID()}-${timestamp}-${deviceId}-${this.exchangeName(prefix, suffix)}.${this.tempQueueSuffix}`;
    };
    /**
     * Generate the exchange name for a device's channel
     *
     * @private
     * @param {String} prefix - It could be a device id or a stream name
     * @param {String} suffix - It could be a channel name or a the default stream suffix (livestream)
     * @return a string that represents the complete exchange name
     */
    this.exchangeName = (prefix, suffix) => {
      return prefix.length > 0 && suffix.length > 0 ? `${this.liveStreamByName(prefix)}.${suffix}` : `${suffix}`;
    };
    // ------------ PRIVATE METHODS -------------------
    /**
     * Generate the complete hostname string for an endpoint
     *
     * @private
     * @return the string representing the endpoint url
     */
    this.generateHostname = () => {
      if (this.endpoint.url) {
        return this.endpoint.url;
      }
      const port = this.tls ? this.endpoint.securePort : this.endpoint.port;
      let hostname = `${this.endpoint.host}:${port}`;
      const protocol = this.tls ? this.endpoint.secureProtocol : this.endpoint.protocol;
      if (protocol && !hostname.startsWith(protocol)) {
        hostname = `${protocol}://${hostname}`;
      }
      return hostname;
    };
    // TODO Load from LocalStorage if in browser
    this.loadCachedMessages = () => {
      let cachedMessages = [];
      if (this.cachedMessagesPath && import_fs.default.existsSync(this.cachedMessagesPath)) {
        cachedMessages = JSON.parse(import_fs.default.readFileSync(this.cachedMessagesPath, { encoding: "utf-8" }));
      }
      this.cachedMessages = cachedMessages || [];
    };
    // TODO Save to LocalStorage if in browser
    this.writeCachedMessagesFile = () => {
      if (!this.cachedMessagesPath) return;
      try {
        import_fs.default.writeFileSync(this.cachedMessagesPath, JSON.stringify(this.cachedMessages, null, 2));
        this.log("silly", `Cached messages written to: ${this.cachedMessagesPath}`);
      } catch (error) {
        this.log("error", "Error writing cached messages");
        this.log("error", error);
      }
    };
    this.cacheMessage = (channel, message, options) => {
      const messageToCache = { channel, message, options };
      const alreadyCached = this.cachedMessages.some((el) => isDeepStrictEqual(el, messageToCache));
      if (!alreadyCached) {
        if (this.cachedMessages.length >= this.cacheSize) {
          this.log("debug", "Message cache full, removing eldest message");
          this.cachedMessages.shift();
        }
        this.log("warn", "Caching message..");
        this.log("silly", "Message cached:", messageToCache);
        this.cachedMessages.push(messageToCache);
        this.writeCachedMessagesFile();
      }
    };
    this.connectionParams = camelizeKeys(opts);
    const {
      endpoint,
      deviceKey,
      channels,
      deviceId,
      client,
      secret,
      host,
      port,
      vhost,
      inboxTopic,
      tls,
      verbose,
      autoReconnect,
      heartbeat,
      connectionTimeout,
      caching,
      cacheSize,
      cachedMessagesPath
    } = this.connectionParams;
    const defaultEndpoint = {
      protocol: "http",
      secureProtocol: "https",
      host: "api.spacebunny.io",
      port: 80,
      securePort: 443,
      deviceConfigurationsPath: "device_configurations",
      liveStreamKeyConfigurationsPath: "live_stream_key_configurations"
    };
    this.endpoint = { ...defaultEndpoint, ...endpoint };
    this.manualConfigurations = false;
    this.deviceKey = deviceKey;
    this.channels = channels;
    this.deviceId = deviceId;
    this.client = client;
    this.secret = secret;
    this.host = host;
    this.port = port;
    this.vhost = vhost;
    this.inboxTopic = inboxTopic || "inbox";
    this.liveStreamSuffix = "live_stream";
    this.tempQueueSuffix = "temp";
    this.liveStreams = [];
    this.tls = !(tls === false);
    this.autoReconnect = !(autoReconnect === false);
    this.verbose = verbose === true;
    this.heartbeat = heartbeat || _SpaceBunny.DEFAULT_HEARTBEAT;
    this.connectionTimeout = connectionTimeout || _SpaceBunny.DEFAULT_CONNECTION_TIMEOUT;
    this.endpointConfigs = {};
    this.caching = caching === true;
    this.cacheSize = cacheSize || _SpaceBunny.DEFAULT_CACHE_SIZE;
    this.cachedMessagesPath = cachedMessagesPath;
    this.loadCachedMessages();
  }
  static {
    this.DEFAULT_CONNECTION_TIMEOUT = 5e3;
  }
  static {
    this.DEFAULT_RECONNECT_TIMEOUT = 5e3;
  }
  static {
    this.DEFAULT_HEARTBEAT = 60;
  }
  static {
    this.DEFAULT_CACHE_SIZE = 100;
  }
  static {
    this.subscriptionCounter = 0;
  }
  static generateSubscriptionName() {
    _SpaceBunny.subscriptionCounter += 1;
    return `subscription-${Date.now()}-${_SpaceBunny.subscriptionCounter}`;
  }
};
var spacebunny_default = SpaceBunny;

// src/protocols/amqpClient.ts
var AmqpClient = class extends spacebunny_default {
  /**
   * @constructor
   * @param {Object} opts - options must contain Device-Key or connection options
   * (deviceId and secret) for devices.
   */
  constructor(opts = {}) {
    super(opts);
    /**
     * Subscribe to input channel
     *
     * @param {function} callback - function called every time a message is received
     * passing the current message as argument
     * @param {Object} options - subscription options
     * @return promise containing the result of the subscription
     */
    this.onMessage = async (callback, opts = {}) => {
      const name = this.addAmqpListener(callback, opts);
      await this.bindAmqpListener(name);
      return name;
    };
    /**
     * Publish a message on a specific channel
     *
     * @param {String} channel - channel name on which you want to publish a message
     * @param {Object} message - the message payload
     * @param {Object} opts - publication options
     * @return promise containing the result of the subscription
     */
    this.publish = async (channel, message, opts = {}, publishOpts = {}) => {
      const { routingKey = void 0, topic = void 0, withConfirm = false } = opts;
      const ch = await this.createChannel("output", { withConfirm });
      if (this.isConnected()) {
        try {
          const encapsulatedContent = encapsulateContent(message);
          const rKey = this.routingKeyFor({ channel, routingKey, topic });
          const deviceId = this.getDeviceId();
          await ch.checkExchange(deviceId);
          const res = ch.publish(deviceId, rKey, Buffer.from(encapsulatedContent), publishOpts);
          if (!res) {
            this.log("error", `Publish on channel ${channel} failed: ${encapsulatedContent}`);
            return false;
          }
          if (withConfirm === true && res) {
            await ch.waitForConfirms();
          }
          this.log("debug", `Message published on channel ${channel} successfully`);
          return true;
        } catch (error) {
          this.log("error", `Error publishing on channel ${channel}`);
          throw error;
        }
      } else {
        throw new Error(
          `${this.getClassName()} - Error sending message on channel ${channel} when client is not connected`
        );
      }
    };
    /**
     * Destroy the connection between the amqp client and broker
     *
     * @return a promise containing the result of the operation
     */
    this.disconnect = async () => {
      if (this.isConnected()) {
        try {
          const channels = Object.keys(this.amqpChannels);
          for (let index = 0; index < channels.length; index += 1) {
            const channelName = channels[index];
            if (this.amqpChannels[channelName]) {
              await this.amqpChannels[channelName].close();
              delete this.amqpChannels[channelName];
            }
          }
          this.amqpConnection.removeAllListeners();
          await this.amqpConnection.close();
        } catch (error) {
          this.log("error", "Error disconnecting client.");
          throw error;
        }
      } else {
        this.log("info", "Client already disconnected.");
      }
      this.amqpConnection = void 0;
      this.amqpChannels = {};
      this.connected = false;
      this.emit("disconnect");
      return true;
    };
    /**
     * Establish an amqp connection with the broker
     * using configurations retrieved from the endpoint.
     * If the connnection already exists, returns the current connnection
     *
     * @return a promise containing current connection
     */
    this.connect = async (opts = {}, socketOptions = {}) => {
      if (this.isConnected()) {
        return this.amqpConnection;
      }
      await this.getEndpointConfigs();
      try {
        this.log("debug", "Connecting client..");
        this.amqpConnection = await amqp.connect(
          {
            protocol: this.tls ? this.tlsProtocol : this.protocol,
            hostname: this.connectionParams.host,
            port: this.tls ? this.connectionParams.protocols.amqp.tlsPort : this.connectionParams.protocols.amqp.port,
            username: this.connectionParams.deviceId || this.connectionParams.client,
            password: this.connectionParams.secret,
            vhost: this.connectionParams.vhost.replace("/", "%2f"),
            frameMax: opts.frameMax || this.defaultConnectionOpts.frameMax,
            heartbeat: opts.heartbeat || this.heartbeat
          },
          {
            timeout: this.connectionTimeout,
            ...socketOptions
          }
        );
        const onError = (err) => {
          if (this.reconnecting) return;
          if (err) {
            this.emit("error", err);
            this.log("error", err);
          }
          if (!isNullOrUndefined(this.amqpConnection)) {
            this.amqpConnection.removeAllListeners();
            this.amqpConnection = void 0;
          }
          this.connected = false;
          if (this.autoReconnect) {
            this.reconnecting = true;
            void this.connect(opts).finally(() => {
              this.reconnecting = false;
            });
          }
        };
        const onBlock = (reason) => {
          if (reason) {
            this.emit("blocked", reason);
            this.log("warn", reason);
          }
        };
        this.amqpConnection.on("error", onError);
        this.amqpConnection.on("close", onError);
        this.amqpConnection.on("blocked", onBlock);
        this.amqpConnection.on("unblocked", onBlock);
        this.connected = true;
        this.emit("connect");
        this.log("debug", "Client connected!");
        return this.amqpConnection;
      } catch (error) {
        if (!isNullOrUndefined(this.amqpConnection)) {
          this.amqpConnection.removeAllListeners();
          this.amqpConnection = void 0;
        }
        this.connected = false;
        this.log("error", "Error during connection");
        if (this.autoReconnect) {
          this.log("error", error.message);
          await new Promise((resolve) => setTimeout(resolve, this.reconnectTimeout));
          void this.connect(opts);
        } else {
          throw error;
        }
      }
    };
    this.isConnected = () => {
      return this.amqpConnection !== void 0 && this.connected;
    };
    this.removeAmqpListener = async (name) => {
      if (isNullOrUndefined(this.amqpListeners[name])) {
        this.log("error", `AMQP listener ${name} does not exist.`);
        return;
      }
      await this.unsubscribe(this.amqpListeners[name].consumerTag);
      delete this.amqpListeners[name];
    };
    // ------------ PROTECTED METHODS -------------------
    /**
     * Unsubscribe client from a topic
     *
     * @param {String} consumerTag - Consumer Tag
     * @return a promise containing the result of the operation
     */
    this.unsubscribe = async (consumerTag) => {
      if (this.isConnected()) {
        try {
          const ch = await this.createChannel("input");
          if (ch) {
            await ch.cancel(consumerTag);
          }
          this.log("debug", `Unsubscrbed ${consumerTag}`);
        } catch (error) {
          this.log("error", `Error unsubscribing from ${consumerTag}`);
          throw error;
        }
      } else {
        throw new Error(
          `${this.getClassName()} - Error trying to unsucscribe from ${consumerTag} on an invalid connection`
        );
      }
    };
    /**
     * Creates a channel on current connection
     *
     * @private
     * @param {String} channelName - indicates the channel name
     * @param {Object} opts - channel options
     * @return a promise containing the current channel
     */
    this.createChannel = async (channel, opts = {}) => {
      const { withConfirm = true } = opts;
      const channelName = `${channel}${withConfirm === true ? "WithConfirm" : ""}`;
      if (this.isConnected()) {
        try {
          if (isNullOrUndefined(this.amqpChannels[channelName])) {
            this.amqpChannels[channelName] = withConfirm === true || channelName.endsWith("WithConfirm") ? await this.amqpConnection.createConfirmChannel() : await this.amqpConnection.createChannel();
            this.emit("channelOpen", channelName);
            const errorCallback = (err) => {
              if (err) {
                this.log("error", err);
              }
              if (!isNullOrUndefined(this.amqpChannels[channelName])) {
                this.amqpChannels[channelName].removeAllListeners();
                this.amqpChannels[channelName] = void 0;
              }
              if (channel.startsWith("input")) {
                this.emit("channelClose", channelName);
              }
            };
            this.amqpChannels[channelName].on("error", errorCallback);
            this.amqpChannels[channelName].on("close", errorCallback);
          }
          return this.amqpChannels[channelName];
        } catch (error) {
          this.log("error", `Error creating channel: ${channelName}`);
          throw error;
        }
      } else {
        throw new Error(`${this.getClassName()} - Error trying to open a channel on an invalid connection`);
      }
    };
    /**
     * Close a channel on current connection
     *
     * @private
     * @param {String} channelName - indicates if the channel is input or output
     * @return a promise containing the result of the operation
     */
    this.closeChannel = async (channelName, opts = {}) => {
      try {
        const { withConfirm = true } = opts;
        const fullChannelName = `${channelName}${withConfirm === true ? "WithConfirm" : ""}`;
        if (this.amqpChannels[fullChannelName]) {
          await this.amqpChannels[fullChannelName].close();
          this.amqpChannels[fullChannelName] = void 0;
        }
      } catch (error) {
        this.log("error", `Error closing channel ${channelName}`);
        throw error;
      }
    };
    this.consumeCallback = (ch, callback, opts, message) => {
      try {
        const { ack = void 0, allUpTo = false, requeue = false } = opts || {};
        if (isNullOrUndefined(message)) {
          return;
        }
        const { discardMine, discardFromApi } = opts || {};
        const amqpMessage = new amqpMessage_default({
          message,
          receiverId: this.getClient() || "",
          channel: ch,
          subscriptionOpts: { discardMine, discardFromApi }
        });
        const ackNeeded = this.autoAck(ack);
        if (amqpMessage.blackListed()) {
          if (ackNeeded) {
            amqpMessage.nack({ allUpTo, requeue });
          }
          return;
        }
        void callback(amqpMessage.getContent(), amqpMessage.getFields(), amqpMessage.getProperties());
        if (ackNeeded) {
          amqpMessage.ack({ allUpTo });
        }
      } catch (error) {
        this.log("error", "Error consuming message");
        this.log("error", error);
      }
    };
    // ------------ PRIVATE METHODS -------------------
    this.clearConsumers = () => {
      const names = Object.keys(this.amqpListeners);
      for (let index = 0; index < names.length; index += 1) {
        const name = names[index];
        const listener = this.amqpListeners[name];
        delete listener.consumerTag;
      }
    };
    this.addAmqpListener = (callback, opts = {}) => {
      const name = spacebunny_default.generateSubscriptionName();
      this.amqpListeners[name] = { callback, opts };
      return name;
    };
    this.bindAmqpListeners = async () => {
      const names = Object.keys(this.amqpListeners);
      for (let index = 0; index < names.length; index += 1) {
        const name = names[index];
        await this.bindAmqpListener(name);
      }
    };
    this.bindAmqpListener = async (name) => {
      if (isNullOrUndefined(this.amqpListeners[name])) {
        this.log("error", `Listner ${name} does not exist.`);
        return;
      }
      if (!isNullOrUndefined(this.amqpListeners[name].consumerTag)) {
        this.log("warn", `Listner ${name} already bound to a consumer.`);
        return;
      }
      const { callback, opts } = this.amqpListeners[name];
      const noAck = isNullOrUndefined(opts?.ack);
      const channelName = "input";
      const ch = await this.createChannel(channelName, { withConfirm: false });
      try {
        await ch.checkQueue(`${this.getDeviceId()}.${this.getInboxTopic()}`);
        const { consumerTag } = await ch.consume(
          `${this.getDeviceId()}.${this.getInboxTopic()}`,
          this.consumeCallback.bind(this, ch, callback, opts),
          { noAck }
        );
        this.amqpListeners[name].consumerTag = consumerTag;
      } catch (error) {
        this.log("error", `Error consuming from ${channelName} channel.`);
        throw error;
      }
    };
    /**
     * Generate the routing key for a specific channel
     *
     * @private
     * @param {Object} params - params
     * @return a string that represents the routing key for that channel
     */
    this.routingKeyFor = (params = {}) => {
      const { channel = void 0, routingKey = void 0, topic = void 0 } = params;
      if (routingKey) {
        return routingKey;
      }
      let messageRoutingKey = this.getDeviceId() || "";
      if (!isNullOrUndefined(channel) && channel.length > 0) {
        messageRoutingKey += `.${channel || ""}`;
      }
      if (!isNullOrUndefined(topic) && topic.length > 0) {
        messageRoutingKey += `.${topic || ""}`;
      }
      return messageRoutingKey;
    };
    /**
     * Check if the SDK have to automatically ack messages
     *
     * @private
     * @param {String} ack - the ack type, it should be 'manual' or 'auto'
     * @return boolean - true if messages have to be autoacked, false otherwise
     */
    this.autoAck = (ack) => {
      if (ack) {
        if (!this.ackTypes.includes(ack)) {
          this.log("error", "Wrong acknowledge type");
        }
        switch (ack) {
          case "auto":
            return true;
          default:
            return false;
        }
      }
      return false;
    };
    this.publishCachedMessages = async () => {
      if (this.isConnected() && this.cachedMessages.length > 0) {
        const cachedMessagesToSend = structuredClone(this.cachedMessages);
        this.log("debug", `Publishing ${cachedMessagesToSend.length} cached messages...`);
        for (let index = 0; index < cachedMessagesToSend.length; index += 1) {
          const cachedMessage = cachedMessagesToSend[index];
          this.log("silly", `Sending message ${index + 1} from cache`);
          const { message, channel, options } = cachedMessage;
          const res = await this.publish(channel, message, options);
          if (res) {
            const itemToRemove = this.cachedMessages.findIndex((el) => {
              return isDeepStrictEqual(el, cachedMessage);
            });
            if (itemToRemove !== -1) {
              this.cachedMessages.splice(itemToRemove, 1);
            }
          }
        }
        this.writeCachedMessagesFile();
      }
    };
    this.amqpConnection = void 0;
    this.amqpChannels = {};
    this.protocol = "amqp";
    this.tlsProtocol = "amqps";
    this.defaultConnectionOpts = { frameMax: 32768 };
    this.ackTypes = ["auto", "manual"];
    this.connected = false;
    this.reconnecting = false;
    this.amqpListeners = {};
    this.on("connect", () => {
      void this.bindAmqpListeners();
      void this.publishCachedMessages();
    });
    this.on("disconnect", () => {
      this.amqpListeners = {};
    });
    this.on("channelClose", () => {
      this.clearConsumers();
    });
  }
};
var amqpClient_default = AmqpClient;

// src/protocols/amqpStreamClient.ts
var AmqpStreamClient = class extends amqpClient_default {
  /**
   * @constructor
   * @param {ISpaceBunnyParams} opts - options must contain client and secret for access keys
   */
  constructor(opts = {}) {
    super(opts);
    /**
     * Subscribe to multiple stream hooks
     *
     * @param {Array} streamHooks - Array of objects. Each objects containing
     * { name: {string}, deviceId: {string}, channel: {string}, callback: {func} }
     * @param {Object} options - subscription options
     * @return promise containing the result of multiple subscriptions
     */
    this.streamFrom = async (streamHooks = [], opts = {}) => {
      const hooks = Array.isArray(streamHooks) ? streamHooks : [streamHooks];
      const names = [];
      for (let index = 0; index < hooks.length; index += 1) {
        const streamHook = hooks[index];
        const name = this.addAmqpStreamListener(streamHook, opts);
        await this.bindAmqpStreamListener(name);
        names.push(name);
      }
      return names;
    };
    this.removeAmqpStreamListener = async (name) => {
      if (isNullOrUndefined(this.amqpStreamListeners[name])) {
        this.log("error", `AMQP listener ${name} does not exist.`);
        return;
      }
      await this.unsubscribe(this.amqpStreamListeners[name].consumerTag);
      delete this.amqpStreamListeners[name];
    };
    // ------------ PRIVATE METHODS -------------------
    this.clearStreamConsumers = () => {
      const names = Object.keys(this.amqpStreamListeners);
      for (let index = 0; index < names.length; index += 1) {
        const name = names[index];
        const listener = this.amqpStreamListeners[name];
        delete listener.consumerTag;
      }
    };
    this.addAmqpStreamListener = (streamHook, opts = {}) => {
      const name = spacebunny_default.generateSubscriptionName();
      this.amqpStreamListeners[name] = { streamHook, opts };
      return name;
    };
    this.bindAmqpStreamListeners = async () => {
      const names = Object.keys(this.amqpStreamListeners);
      for (let index = 0; index < names.length; index += 1) {
        const name = names[index];
        await this.bindAmqpStreamListener(name);
      }
    };
    /**
     * Start consuming messages from a device's channel
     * It generates an auto delete queue from which consume
     * and binds it to the channel exchange
     *
     * @private
     * @param {Object} streamHook - Object containit hook info
     * { stream: {String}, callback: {func}}
     * or
     * { deviceId: {String}, channel: {String}, callback: {func}}
     * @param {Object} opts - connection options
     * @return a promise containing current connection
     */
    this.bindAmqpStreamListener = async (name) => {
      if (isNullOrUndefined(this.amqpStreamListeners[name])) {
        this.log("error", `Listner ${name} does not exist.`);
        return;
      }
      if (!isNullOrUndefined(this.amqpStreamListeners[name].consumerTag)) {
        this.log("warn", `Listner ${name} already bound to a consumer.`);
        return;
      }
      const { streamHook, opts } = this.amqpStreamListeners[name];
      const {
        stream = void 0,
        deviceId = void 0,
        channel = void 0,
        cache = true,
        topic = void 0,
        routingKey = void 0,
        callback = void 0
      } = streamHook;
      const noAck = isNullOrUndefined(opts?.ack);
      if (isNullOrUndefined(stream) && (isNullOrUndefined(channel) || isNullOrUndefined(deviceId))) {
        throw new Error(`${this.getClassName()} - Missing Stream or Device ID and Channel`);
      }
      if (isNullOrUndefined(callback)) {
        throw new Error(`${this.getClassName()} - Missing Callback`);
      }
      const currentTime = (/* @__PURE__ */ new Date()).getTime();
      let tempQueue;
      let streamName;
      const ch = await this.createChannel("input");
      try {
        if (stream) {
          if (!this.liveStreamExists(stream)) {
            throw new Error(`${this.getClassName()} - Stream ${stream} does not exist`);
          }
          if (cache) {
            tempQueue = this.cachedStreamQueue(stream);
            streamName = tempQueue;
            await ch.checkQueue(tempQueue);
          } else {
            const streamExchange = this.exchangeName(stream, this.liveStreamSuffix);
            streamName = streamExchange;
            tempQueue = this.tempQueue(stream, this.liveStreamSuffix, currentTime);
            await ch.checkExchange(streamExchange);
            await ch.assertQueue(tempQueue, this.streamQueueArguments);
            await ch.bindQueue(tempQueue, streamExchange, routingKey || "#");
          }
        } else {
          const channelExchangeName = this.exchangeName(deviceId, channel);
          streamName = channelExchangeName;
          tempQueue = this.tempQueue(deviceId, channel, currentTime);
          await ch.checkExchange(channelExchangeName);
          await ch.assertQueue(tempQueue, this.streamQueueArguments);
          await ch.bindQueue(
            tempQueue,
            channelExchangeName,
            this.streamRoutingKeyFor({ deviceId, channel, routingKey, topic })
          );
        }
        const { consumerTag } = await ch.consume(tempQueue, this.consumeCallback.bind(this, ch, callback, opts), {
          noAck
        });
        this.log("debug", `Streaming from ${streamName}..`);
        this.amqpStreamListeners[name].consumerTag = consumerTag;
      } catch (error) {
        this.log("error", "Error adding stream hook", streamHook);
        throw error;
      }
    };
    /**
     * Generate the exchange name for a device's channel
     *
     * @private
     * @param {String} streamName - stream name from which you want to stream
     * @return a string that represents the stream queue
     */
    this.cachedStreamQueue = (streamName) => {
      return `${streamName}.${this.liveStreamSuffix}`;
    };
    /**
     * Generate the exchange name for a device's channel
     *
     * @private
     * @param {Object} opts - opts
     * @return a string that represents the rounting key
     */
    this.streamRoutingKeyFor = (opts = {}) => {
      const { deviceId = "", channel = "", routingKey = "", topic = "" } = opts;
      if (routingKey.length === 0 && deviceId.length === 0) {
        return this.defaultStreamRoutingKey;
      }
      if (routingKey.length > 0) {
        return routingKey;
      }
      let streamRoutingKey = deviceId || "";
      if (channel) {
        streamRoutingKey += `.${channel}`;
      }
      if (topic) {
        streamRoutingKey += `.${topic}`;
      }
      return `${streamRoutingKey}`;
    };
    this.defaultStreamRoutingKey = "#";
    this.streamQueueArguments = { exclusive: true, autoDelete: true, durable: false };
    this.amqpStreamListeners = {};
    this.on("connect", () => {
      void this.bindAmqpStreamListeners();
    });
    this.on("disconnect", () => {
      this.amqpStreamListeners = {};
    });
    this.on("channelClose", () => {
      this.clearStreamConsumers();
    });
  }
};
delete AmqpStreamClient.prototype.onMessage;
delete AmqpStreamClient.prototype.publish;
var amqpStreamClient_default = AmqpStreamClient;

// src/protocols/mqttClient.ts
var import_mqtt = __toESM(require("mqtt"));
var import_fs2 = __toESM(require("fs"));
var MqttClient = class extends spacebunny_default {
  /**
   * @constructor
   * @param {Object} opts - options must contain Device-Key or connection options
   * (deviceId and secret) for devices.
   */
  constructor(opts = {}) {
    super(opts);
    this.mqttListeners = {};
    this.topics = [];
    /**
     * Subscribe to input channel
     *
     * @param {function} callback - function called every time a message is received
     * passing the current message as argument
     * @param {Object} options - subscription options
     * @return promise containing the result of the subscription
     */
    this.onMessage = async (callback, opts = { qos: 1 }) => {
      const topic = this.topicFor(null, this.inboxTopic);
      this.addMqttListener(topic, callback, topic);
      await this.subscribe(topic, opts);
      return topic;
    };
    /**
     * Publish a message on a specific channel
     *
     * @param {String} channel - channel name on which you want to publish a message
     * @param {Object/String} message - the message payload
     * @param {Object} opts - publication options
     * @return a promise containing the result of the operation
     */
    this.publish = async (channel, message, opts = { qos: 1 }) => {
      if (this.isConnected()) {
        const topic = this.topicFor(null, channel);
        try {
          const bufferedMessage = Buffer.from(encapsulateContent(message));
          await this.mqttClient.publishAsync(topic, bufferedMessage, opts);
          this.log("silly", `Published message on topic ${topic}`);
          return true;
        } catch (error) {
          this.log("error", `Error publishing on topic ${topic}`);
          throw error;
        }
      } else {
        throw new Error(
          `${this.getClassName()} - Error sending message on channel ${channel} when client is not connected.`
        );
      }
    };
    /**
     * Establish an mqtt connection with the broker.
     * If a connection already exists, returns the current connection
     *
     * @param {Object} opts - connection options
     * @return a promise containing current connection
     */
    this.connect = async (opts = {}) => {
      if (this.isConnected()) {
        return this.mqttClient;
      }
      await this.getEndpointConfigs();
      try {
        const clientId = this.connectionParams.deviceId || this.connectionParams.client;
        let mqttConnectionParams = {
          host: this.connectionParams.host,
          protocol: this.tls ? "mqtts" : "mqtt",
          port: this.tls ? this.connectionParams.protocols.mqtt.tlsPort : this.connectionParams.protocols.mqtt.port,
          username: `${this.connectionParams.vhost}:${clientId}`,
          password: this.connectionParams.secret,
          // Client id is used for resource authorization, multiple clients with the same clientId are not allowed
          clientId,
          connectTimeout: opts.connectTimeout || this.connectionTimeout,
          reconnectPeriod: this.autoReconnect ? opts.reconnectPeriod || this.reconnectTimeout : 0,
          // disable autoreconnect ??
          clean: isNullOrUndefined(opts.clean) ? true : opts.clean,
          keepalive: opts.keepalive || this.heartbeat
          // ...opts
        };
        if (this.tls) {
          mqttConnectionParams = { ...mqttConnectionParams, ...this.tlsOpts };
        }
        this.mqttClient = await import_mqtt.default.connectAsync(mqttConnectionParams);
        this.mqttClient.on("error", (err) => {
          this.emit("error", err);
          this.log("error", err);
        });
        this.mqttClient.on("close", () => {
          this.log("info", "Connection closed");
        });
        this.mqttClient.on("offline", () => {
          this.log("warn", "Client offline");
        });
        this.mqttClient.on("reconnect", () => {
          this.log("info", "Reconnecting...");
        });
        this.mqttClient.on("message", (msgTopic, message) => {
          try {
            let msg = {};
            try {
              msg = JSON.parse(message.toString());
            } catch (e) {
              msg = message.toString();
            }
            Object.entries(this.mqttListeners).forEach(([, listener]) => {
              const { callback, topics } = listener;
              if (!topics || topics.length === 0 || topics.includes(msgTopic)) {
                this.log("debug", `Received message for topic ${msgTopic}`, msg);
                void callback(msgTopic, msg);
              } else {
                this.log("silly", `Received unlistened message for topic ${msgTopic}`, msg);
              }
            });
          } catch (error) {
            this.log("error", "Error consuming message");
            this.log("error", error);
          }
        });
        this.emit("connect");
        this.log("debug", "Client connected!");
        return this.mqttClient;
      } catch (error) {
        if (!isNullOrUndefined(this.mqttClient)) {
          this.mqttClient.removeAllListeners();
          this.mqttClient = void 0;
        }
        this.log("error", "Error during connection");
        if (this.autoReconnect) {
          this.log("error", error.message);
          await new Promise((resolve) => setTimeout(resolve, this.reconnectTimeout));
          void this.connect(opts);
        } else {
          throw error;
        }
      }
    };
    this.isConnected = () => {
      return !isNullOrUndefined(this.mqttClient) && this.mqttClient.connected;
    };
    // ------------ PROTECTED METHODS -------------------
    this.addMqttListener = (name, callback, topics) => {
      this.mqttListeners[name] = { callback, topics: Array.isArray(topics) ? topics : topics ? [topics] : [] };
    };
    this.removeMqttListener = (name) => {
      delete this.mqttListeners[name];
    };
    this.subscribe = async (topics, opts = { qos: 1 }) => {
      if (this.isConnected()) {
        const topicsToSubscribe = Array.isArray(topics) ? topics : [topics];
        await this.mqttClient.subscribeAsync(topicsToSubscribe, opts);
        this.topics.push(...topicsToSubscribe);
        this.log("info", `Client subscribed to topics: ${topicsToSubscribe.join(",")}`);
      } else {
        throw new Error(`${this.getClassName()} - Trying to subscribe when client is not connected`);
      }
    };
    // ------------ PRIVATE METHODS -------------------
    /**
     * Generate the topic for a specific channel
     *
     * @private
     * @param {String} deviceId - device id
     * @param {String} channel - channel name on which you want to publish a message
     * @return a string that represents the topic name for that channel
     */
    this.topicFor = (deviceId, channel) => {
      return `${deviceId || this.getDeviceId()}/${channel}`;
    };
    this.publishCachedMessages = async () => {
      if (this.isConnected() && this.cachedMessages.length > 0) {
        const cachedMessagesToSend = structuredClone(this.cachedMessages);
        this.log("debug", `Publishing ${cachedMessagesToSend.length} cached messages...`);
        for (let index = 0; index < cachedMessagesToSend.length; index += 1) {
          const cachedMessage = cachedMessagesToSend[index];
          this.log("silly", `Sending message ${index + 1} from cache`);
          const { message, channel, options } = cachedMessage;
          const res = await this.publish(channel, message, { qos: 1, ...options });
          if (res) {
            const itemToRemove = this.cachedMessages.findIndex((el) => {
              return isDeepStrictEqual(el, cachedMessage);
            });
            if (itemToRemove !== -1) {
              this.cachedMessages.splice(itemToRemove, 1);
            }
          }
        }
        this.writeCachedMessagesFile();
      }
    };
    this.topics = [];
    this.mqttClient = void 0;
    this.protocol = "mqtt";
    this.tlsProtocol = "mqtts";
    this.connectionOpts = { qos: 1, clean: true };
    const { cert, key, passphrase, ca, pfx, disableCertCheck } = opts;
    this.tlsOpts = {};
    if (cert) {
      this.tlsOpts.cert = import_fs2.default.readFileSync(cert);
    }
    if (key) {
      this.tlsOpts.key = import_fs2.default.readFileSync(key);
    }
    if (passphrase) {
      this.tlsOpts.passphrase = passphrase;
    }
    if (ca) {
      if (Array.isArray(ca)) {
        this.tlsOpts.ca = ca.map((element) => {
          return import_fs2.default.readFileSync(element);
        });
      } else {
        this.tlsOpts.ca = [import_fs2.default.readFileSync(ca)];
      }
    }
    if (pfx) {
      this.tlsOpts.pfx = import_fs2.default.readFileSync(pfx);
    }
    if (disableCertCheck) {
      this.tlsOpts.rejectUnauthorized = false;
    } else {
      this.tlsOpts.rejectUnauthorized = true;
    }
    this.on("connect", () => {
      void this.publishCachedMessages();
    });
  }
  /**
   * Destroy the connection between the mqtt client and broker
   *
   * @return a promise containing the result of the operation
   */
  async disconnect() {
    if (this.isConnected()) {
      try {
        await this.unsubscribe();
        this.mqttClient.removeAllListeners();
        await this.mqttClient.endAsync();
      } catch (error) {
        this.log("error", "Error disconnecting client.");
        throw error;
      }
    }
    this.mqttClient = void 0;
    this.mqttListeners = {};
    this.topics = [];
    this.emit("disconnected");
    this.log("info", "disconnected");
    return true;
  }
  /**
   * Unsubscribe client from a list of topics
   *
   * @param {Object} topics - list of topics { topic: qos, ... }
   * e.g. { topic_1: 1, topic_2: 0 }
   * @return a promise containing the result of the operation
   */
  async unsubscribe(topics = []) {
    let topicsToUnsubscribe = this.topics.length > 0 && topics.length === 0 ? this.topics : topics;
    topicsToUnsubscribe = Array.isArray(topicsToUnsubscribe) ? topicsToUnsubscribe : [topicsToUnsubscribe];
    if (this.isConnected()) {
      if (topicsToUnsubscribe.length > 0) {
        await this.mqttClient.unsubscribeAsync(topicsToUnsubscribe);
      }
      this.topics = this.topics.filter((t) => !topicsToUnsubscribe.includes(t));
      this.log("info", `Client unsubscribed from topics: ${topicsToUnsubscribe.join(",")}`);
    } else {
      throw new Error(
        `${this.getClassName()} - Error trying to unsucscribe from ${topicsToUnsubscribe.join(",")} on an invalid connection`
      );
    }
  }
};
var mqttClient_default = MqttClient;

// src/protocols/mqttStreamClient.ts
var MqttStreamClient = class extends mqttClient_default {
  /**
   * @constructor
   * @param {Object} opts - options must contain client and secret for access keys
   */
  constructor(opts = {}) {
    super(opts);
    /**
     * Subscribe to multiple stream hooks
     *
     * @param {Array} streamHooks - Array of objects. Each objects containing
     * { deviceId: {string}, channel: {string}, callback: {func} }
     * @param {Object} options - subscription options
     * @return promise containing the result of multiple subscriptions
     */
    this.streamFrom = async (streamHooks = [], opts = { qos: 1 }) => {
      const hooks = Array.isArray(streamHooks) ? streamHooks : [streamHooks];
      const promises = [];
      for (let index = 0; index < hooks.length; index += 1) {
        const streamHook = hooks[index];
        const promise = this.addStreamHook(streamHook, opts);
        promises.push(promise);
      }
      return Promise.all(promises);
    };
    /**
     * Start consuming messages from a device's channel
     * It generates an auto delete queue from which consume
     * and binds it to the channel exchange
     *
     * @private
     * @param {Object} streamHook - Object containit hook info
     * { stream: {String}, callback: {func}}
     * or
     * { deviceId: {String}, channel: {String}, callback: {func}}
     * @param {Object} opts - connection options
     * @return a promise containing current connection
     */
    this.addStreamHook = async (streamHook, opts = { qos: 1 }) => {
      const {
        stream = void 0,
        deviceId = void 0,
        channel = void 0,
        topic = void 0,
        routingKey = void 0,
        qos = void 0,
        callback = void 0,
        cache = true
      } = streamHook;
      if (isNullOrUndefined(stream) && (isNullOrUndefined(channel) || isNullOrUndefined(deviceId))) {
        this.log("error", "Missing Stream or Device ID and Channel");
        return;
      }
      if (isNullOrUndefined(callback)) {
        this.log("error", "Missing Callback");
        return;
      }
      let topicName = topic || "";
      let topicQOS = qos || this.connectionOpts.qos || 1;
      if (!isNullOrUndefined(stream) && stream.length > 0) {
        if (!this.liveStreamExists(stream)) {
          console.error(`Stream ${stream || ""} does not exist`);
          return;
        }
        topicName = this.streamTopicFor(stream);
        topicQOS = cache ? 1 : 0;
      } else {
        topicName = this.streamChannelTopicFor({ deviceId, channel, topic, routingKey });
      }
      this.addMqttListener(topicName, callback, topicName);
      await this.subscribe(topicName, { ...this.connectionOpts, ...opts, qos: topicQOS });
    };
    // ------------ PRIVATE METHODS -------------------
    /**
     * Generate the topic for a specific channel
     *
     * @private
     * @param {String} deviceId - deviceId from which you want to stream
     * @param {String} channel - channel name from which you want to stream
     * @return a string that represents the topic name for that channel
     */
    this.streamChannelTopicFor = (params = {}) => {
      const { deviceId = "", channel = "", routingKey = "", topic = "" } = params;
      if (routingKey.length === 0 && deviceId.length === 0) {
        return this.defaultStreamRoutingKey;
      }
      if (routingKey.length > 0) {
        return routingKey;
      }
      let streamRoutingKey = deviceId || this.getDeviceId();
      if (channel.length > 0) {
        streamRoutingKey += `/${channel}`;
      }
      if (topic.length > 0) {
        streamRoutingKey += `/${topic}`;
      }
      return `${streamRoutingKey}`;
    };
    /**
     * Generate the topic for a specific stream
     *
     * @private
     * @param {String} streamName - stream name from which you want to stream
     * @return a string that represents the topic name for that stream
     */
    this.streamTopicFor = (stream = "") => {
      return `${stream}/${this.liveStreamSuffix}`;
    };
    this.defaultStreamRoutingKey = "#";
  }
};
delete MqttStreamClient.prototype.onMessage;
delete MqttStreamClient.prototype.publish;
var mqttStreamClient_default = MqttStreamClient;

// src/protocols/stompClient.ts
var import_stompjs = require("@stomp/stompjs");

// src/messages/stompMessage.ts
var StompMessage = class _StompMessage {
  /**
   * @constructor
   * @param {Object} opts - subscription options
   */
  constructor(opts) {
    /**
     * Check if a message should be accepted of rejected
     *
     * @return Boolean - true if should be not considered, false otherwise
     */
    this.blackListed = () => {
      if (this.discardMine && this.receiverId === this.senderId && !this.fromApi()) return true;
      if (this.discardFromApi && this.fromApi()) return true;
      return false;
    };
    /**
     * Check if a message comes from API
     * Check if it contains 'x-from-sb-api' header
     *
     * @return Boolean - true if it comes from API, false otherwise
     */
    this.fromApi = () => {
      return this.headers && this.headers[_StompMessage.FROM_API_HEADER] === "true";
    };
    this.ack = () => {
      this.message.ack();
    };
    this.nack = () => {
      this.message.nack();
    };
    this.getChannelName = () => {
      return this.channelName;
    };
    this.getContent = () => {
      return this.content;
    };
    const { message = void 0, receiverId = "", subscriptionOpts = {} } = opts;
    const { discardMine = false, discardFromApi = false } = subscriptionOpts;
    this.message = message;
    const body = message.body || "{}";
    this.content = parseContent(body);
    this.headers = message.headers || {};
    const destination = this.headers.destination.split("/");
    const [senderId, channelName] = destination[destination.length - 1].split(".");
    this.senderId = senderId;
    this.channelName = channelName;
    this.receiverId = receiverId;
    this.discardMine = discardMine;
    this.discardFromApi = discardFromApi;
  }
  static {
    this.FROM_API_HEADER = "x-from-sb-api";
  }
};
var stompMessage_default = StompMessage;

// src/protocols/stompClient.ts
var StompClient = class extends spacebunny_default {
  /**
   * @constructor
   * @param {Object} opts - options must contain Device-Key or connection options
   * (deviceId and secret) for devices.
   */
  constructor(opts = {}) {
    super(opts);
    this.stompListeners = {};
    this.topics = [];
    /**
     * Subscribe to input channel
     *
     * @param {function} callback - function called every time a message is received
     * passing the current message as argument
     * @param {Object} options - subscription options
     * @return promise containing the result of the subscription
     */
    this.onMessage = (callback, opts = {}) => {
      return new Promise((resolve, reject) => {
        try {
          const topic = this.subcriptionFor(this.existingQueuePrefix, this.inboxTopic);
          const name = this.addStompListener(callback, topic, opts);
          if (this.isConnected()) {
            this.bindStompListner(name);
          }
          resolve();
        } catch (error) {
          this.log("error", error);
          reject(error);
        }
      });
    };
    /**
     * Publish a message on a specific channel
     *
     * @param {String} channel - channel name on which you want to publish a message
     * @param {Object} message - the message payload
     * @param {Object} opts - publication options
     * @return a promise containing the result of the operation
     */
    this.publish = (channel, message, opts = {}) => {
      return new Promise((resolve, reject) => {
        if (this.isConnected()) {
          try {
            const { routingKey = void 0, topic = void 0 } = opts;
            const destination = this.destinationFor({ channel, routingKey, topic });
            this.stompClient.publish({
              destination,
              headers: {},
              body: encapsulateContent(message)
            });
            resolve(true);
          } catch (error) {
            this.log("error", `Error publishing on channel ${channel}`);
            reject(error);
          }
        } else {
          reject(
            new Error(`${this.getClassName()} - Error sending message on channel ${channel} when client is not connected`)
          );
        }
      });
    };
    /**
     * Destroy the connection between the stomp client and broker
     *
     * @return a promise containing the result of the operation
     */
    this.disconnect = () => {
      return new Promise((resolve, reject) => {
        if (!this.isConnected()) {
          resolve(true);
        } else {
          try {
            const listeners = Object.keys(this.stompListeners);
            for (let index = 0; index < listeners.length; index += 1) {
              const name = listeners[index];
              const { subscription } = this.stompListeners[name];
              if (!isNullOrUndefined(subscription)) {
                subscription.unsubscribe();
              }
              delete this.stompListeners[name];
            }
            this.stompClient.deactivate();
            this.stompClient = void 0;
            this.emit("disconnect");
            resolve(true);
          } catch (error) {
            reject(error);
          }
        }
      });
    };
    /**
     * Establish an stomp connection with the broker.
     * If a connection already exists, returns the current connection
     *
     * @param {Object} opts - connection options
     * @return a promise containing current connection
     */
    this.connect = async (opts = {}) => {
      if (this.isConnected()) {
        return this.stompClient;
      }
      await this.getEndpointConfigs();
      return new Promise((resolve, reject) => {
        try {
          const protocol = this.tls ? this.tlsProtocol : this.protocol;
          const port = this.tls ? this.connectionParams.protocols.webStomp.tlsPort : this.connectionParams.protocols.webStomp.port;
          const connectionString = `${protocol}://${this.connectionParams.host}:${port}/ws`;
          const stompConfig = {
            // Typically login, passcode and vhost
            // Adjust these for your broker
            connectHeaders: {
              ...this.connectionHeaders,
              login: this.connectionParams.deviceId || this.connectionParams.client || "",
              passcode: this.connectionParams.secret || "",
              host: this.connectionParams.vhost || ""
            },
            // Broker URL, should start with ws:// or wss:// - adjust for your broker setup
            brokerURL: connectionString,
            // Keep it off for production, it can be quit verbose
            // Skip this key to disable
            // debug: function (str) {
            //   console.log('STOMP: ' + str);
            // },
            // If disconnected, it will retry after reconnectDelay ms
            reconnectDelay: this.autoReconnect ? opts.reconnectDelay || this.reconnectTimeout : 0,
            heartbeatIncoming: opts.heartbeatIncoming || this.heartbeat,
            heartbeatOutgoing: opts.heartbeatOutgoing || this.heartbeat,
            // Subscriptions should be done inside onConnect as those need to reinstated when the broker reconnects
            onConnect: () => {
              this.emit("connect");
              this.log("info", "Client connected!");
              resolve(this.stompClient);
            }
            // onDisconnect: () => {
            //   this.stompClient = undefined;
            // },
            // onStompError: (frame) => {}
          };
          this.stompClient = new import_stompjs.Client(stompConfig);
          this.stompClient.activate();
        } catch (error) {
          this.stompClient = void 0;
          reject(error);
        }
      });
    };
    this.isConnected = () => {
      return !isNullOrUndefined(this.stompClient) && this.stompClient.connected;
    };
    this.removeStompListener = (name) => {
      delete this.stompListeners[name];
    };
    // ------------ PRIVATE METHODS -------------------
    this.consumeCallback = (callback, opts = {}, message) => {
      try {
        const stompMessage = new stompMessage_default({ message, receiverId: this.getDeviceId() || "", subscriptionOpts: opts });
        const ackNeeded = this.autoAck(opts.ack);
        if (stompMessage.blackListed()) {
          if (ackNeeded) {
            message.nack();
          }
          return;
        }
        void callback(stompMessage);
        if (ackNeeded) {
          message.ack();
        }
      } catch (error) {
        this.log("error", "Error consuming message");
        this.log("error", error);
      }
    };
    // ------------ PRIVATE METHODS -------------------
    this.addStompListener = (callback, topic, opts = {}) => {
      const name = spacebunny_default.generateSubscriptionName();
      this.stompListeners[name] = { callback, topic, opts };
      return name;
    };
    this.bindStompListners = () => {
      const names = Object.keys(this.stompListeners);
      for (let index = 0; index < names.length; index += 1) {
        const name = names[index];
        this.bindStompListner(name);
      }
    };
    this.bindStompListner = (name) => {
      if (isNullOrUndefined(this.stompListeners[name])) {
        this.log("error", `Listner ${name} does not exist.`);
        return;
      }
      if (!isNullOrUndefined(this.stompListeners[name].subscription)) {
        this.log("warn", `Listner ${name} already bound to a subscription.`);
        return;
      }
      const { callback, opts, topic } = this.stompListeners[name];
      if (this.isConnected()) {
        this.stompListeners[name].subscription = this.stompClient.subscribe(
          topic,
          this.consumeCallback.bind(this, callback, opts)
        );
        if (!this.topics.includes(topic)) {
          this.topics.push(topic);
        }
        this.log("info", `Client subscribed to topics: ${topic}`);
      } else {
        throw new Error(`${this.getClassName()} - Trying to subscribe when client is not connected`);
      }
    };
    /**
     * Generate the subscription string for a specific channel
     *
     * @private
     * @param {String} type - resource type on which subscribe or publish [exchange/queue]
     * @param {String} channel - channel name on which you want to publish a message
     * @return a string that represents the topic name for that channel
     */
    this.subcriptionFor = (type, channel) => {
      return `/${type}/${this.getDeviceId()}.${channel}`;
    };
    /**
     * Generate the destination string for a specific channel
     *
     * @private
     * @param {String} type - resource type on which subscribe or publish [exchange/queue]
     * @param {String} channel - channel name on which you want to publish a message
     * @return a string that represents the topic name for that channel
     */
    this.destinationFor = (params = {}) => {
      const { type = this.defaultResource, channel = "", topic = "", routingKey = "" } = params;
      let messageRoutingKey;
      if (routingKey.length > 0) {
        messageRoutingKey = routingKey;
      } else {
        messageRoutingKey = this.getDeviceId() || "";
        if (!isNullOrUndefined(channel) && channel.length > 0) {
          messageRoutingKey += `.${channel || ""}`;
        }
        if (!isNullOrUndefined(topic) && topic.length > 0) {
          messageRoutingKey += `.${topic || ""}`;
        }
      }
      return `/${type}/${this.getDeviceId()}/${messageRoutingKey}`;
    };
    /**
     * Check if the SDK have to automatically ack messages
     * By default STOMP messages are acked by the server
     * they need to be acked if client subscribes with { ack: 'client' } option
     *
     * @private
     * @param {String} ack - the ack type, it should be 'client' or null
     * @return boolean - true if messages have to be autoacked, false otherwise
     */
    this.autoAck = (ack) => {
      if (ack) {
        if (!this.ackTypes.includes(ack)) {
          this.emit("error", "Wrong acknowledge type");
        }
        switch (ack) {
          case "client":
            return false;
          default:
            return true;
        }
      }
      return false;
    };
    this.publishCachedMessages = async () => {
      if (this.isConnected() && this.cachedMessages.length > 0) {
        const cachedMessagesToSend = structuredClone(this.cachedMessages);
        this.log("debug", `Publishing ${cachedMessagesToSend.length} cached messages...`);
        for (let index = 0; index < cachedMessagesToSend.length; index += 1) {
          const cachedMessage = cachedMessagesToSend[index];
          this.log("silly", `Sending message ${index + 1} from cache`);
          const { message, channel, options } = cachedMessage;
          const res = await this.publish(channel, message, options);
          if (res) {
            const itemToRemove = this.cachedMessages.findIndex((el) => {
              return isDeepStrictEqual(el, cachedMessage);
            });
            if (itemToRemove !== -1) {
              this.cachedMessages.splice(itemToRemove, 1);
            }
          }
        }
        this.writeCachedMessagesFile();
      }
    };
    this.stompListeners = {};
    this.protocol = "ws";
    this.tlsProtocol = "wss";
    this.wsEndpoint = "ws";
    this.connectionHeaders = {
      max_hbrlck_fails: "10",
      "accept-version": "1.0,1.1,1.2",
      "heart-beat": "10000,10000"
    };
    this.connectionOpts = {};
    this.existingQueuePrefix = "amq/queue";
    this.defaultResource = "exchange";
    this.ackTypes = ["client"];
    this.on("connect", () => {
      this.bindStompListners();
      void this.publishCachedMessages();
    });
    this.on("disconnect", () => {
      this.stompListeners = {};
    });
  }
};
var stompClient_default = StompClient;

// src/protocols/stompStreamClient.ts
var import_crypto2 = __toESM(require("crypto"));
var StompStreamClient = class extends stompClient_default {
  /**
   * @constructor
   * @param {Object} opts - options must contain client and secret for access keys
   */
  constructor(opts = {}) {
    super(opts);
    this.stompStreamListeners = {};
    /**
     * Subscribe to multiple stream hooks
     *
     * @param {Array} streamHooks - Array of objects. Each objects containing
     * { deviceId: {string}, channel: {string}, callback: {func} }
     * @param {Object} options - subscription options
     * @return promise containing the result of multiple subscriptions
     */
    this.streamFrom = async (streamHooks = [], opts = {}) => {
      const hooks = Array.isArray(streamHooks) ? streamHooks : [streamHooks];
      const names = [];
      for (let index = 0; index < hooks.length; index += 1) {
        const streamHook = hooks[index];
        const name = this.addStompStreamListener(streamHook, opts);
        if (this.isConnected()) {
          await this.bindStompStreamListener(name);
        }
        names.push(name);
      }
      return names;
    };
    this.removeStompStreamListener = async (name) => {
      if (isNullOrUndefined(this.stompStreamListeners[name])) {
        this.log("error", `STOMP listener ${name} does not exist.`);
        return;
      }
      await this.unsubscribe(name);
      delete this.stompStreamListeners[name];
    };
    /**
     * Destroy the connection between the stomp client and broker
     *
     * @return a promise containing the result of the operation
     */
    this.disconnect = () => {
      return new Promise((resolve, reject) => {
        if (!this.isConnected()) {
          resolve(true);
        } else {
          try {
            const subscriptions = Object.keys(this.stompStreamListeners);
            for (let index = 0; index < subscriptions.length; index += 1) {
              const name = subscriptions[index];
              const { subscription } = this.stompStreamListeners[name];
              if (!isNullOrUndefined(subscription)) {
                subscription.unsubscribe();
              }
              delete this.stompStreamListeners[name];
            }
            this.stompClient.deactivate();
            this.stompClient = void 0;
            this.emit("disconnect");
            resolve(true);
          } catch (error) {
            reject(error);
          }
        }
      });
    };
    // ------------ PRIVATE METHODS -------------------
    /**
     * Unsubscribe client from a topic
     *
     * @param {String} subscriptionId - subscription ID
     * @return a promise containing the result of the operation
     */
    this.unsubscribe = (name) => {
      return new Promise((resolve, reject) => {
        if (!this.isConnected()) {
          reject(new Error("Invalid connection"));
        } else {
          const { subscription } = this.stompStreamListeners[name];
          if (!isNullOrUndefined(subscription)) {
            subscription.unsubscribe();
            delete this.stompStreamListeners[name].subscription;
            resolve(true);
          } else {
            reject(new Error("Subscription not found"));
          }
        }
      });
    };
    this.addStompStreamListener = (streamHook, opts = {}) => {
      const name = spacebunny_default.generateSubscriptionName();
      this.stompStreamListeners[name] = { streamHook, opts };
      return name;
    };
    this.bindStompStreamListeners = async () => {
      const names = Object.keys(this.stompStreamListeners);
      for (let index = 0; index < names.length; index += 1) {
        const name = names[index];
        await this.bindStompStreamListener(name);
      }
    };
    /**
     * Start consuming messages from a device's channel
     * It generates an auto delete queue from which consume
     * and binds it to the channel exchange
     *
     * @private
     * @param {Object} streamHook - Object containit hook info
     * { deviceId: {String}, channel: {String}, callback: {func}}
     * @param {Object} opts - connection options
     * @return a promise containing current connection
     */
    this.bindStompStreamListener = async (name) => {
      if (isNullOrUndefined(this.stompStreamListeners[name])) {
        this.log("error", `Listner ${name} does not exist.`);
        return;
      }
      if (!isNullOrUndefined(this.stompStreamListeners[name].subscription)) {
        this.log("warn", `Listner ${name} already bound to a consumer.`);
        return;
      }
      return new Promise((resolve, reject) => {
        try {
          const { streamHook, opts } = this.stompStreamListeners[name];
          const {
            stream = void 0,
            deviceId = void 0,
            channel = void 0,
            routingKey = void 0,
            topic = void 0,
            cache = true,
            callback = void 0
          } = streamHook;
          if (isNullOrUndefined(stream) && (isNullOrUndefined(channel) || isNullOrUndefined(deviceId))) {
            this.log("error", "Missing Stream or Device ID and Channel");
            return;
          }
          if (isNullOrUndefined(callback)) {
            this.log("error", "Missing Callback");
            return;
          }
          let streamTopic = "";
          let tempQueue = "";
          if (stream) {
            if (!this.liveStreamExists(stream)) {
              console.error(`Stream ${stream} does not exist`);
              resolve(void 0);
            }
            if (cache) {
              streamTopic = this.cachedStreamTopicFor({ stream });
            } else {
              streamTopic = this.streamTopicFor({ stream, routingKey, topic });
              tempQueue = this.tempQueue(stream, this.liveStreamSuffix);
            }
          } else {
            streamTopic = this.streamChannelTopicFor({
              deviceId,
              channel,
              routingKey,
              topic
            });
            tempQueue = this.tempQueue(deviceId, channel);
          }
          const subscriptionHeaders = {};
          if (tempQueue) {
            subscriptionHeaders["x-queue-name"] = tempQueue;
          }
          const subscriptionId = import_crypto2.default.createHash("md5").update(`${tempQueue}-${streamTopic}`).digest("hex");
          const subscription = this.stompClient.subscribe(streamTopic, this.consumeCallback.bind(this, callback, opts), {
            ...subscriptionHeaders,
            id: subscriptionId
          });
          this.stompStreamListeners[name].subscription = subscription;
          this.log("info", `Client subscribed to topic ${streamTopic}`);
          resolve(subscriptionId);
        } catch (error) {
          this.log("error", error);
          reject(error);
        }
      });
    };
    /**
     * Generate the subscription string for a specific channel
     *
     * @private
     * @param {String} deviceId - deviceId from which you want to stream from
     * @param {String} channel - channel name from which you want to stream from
     * @param {String} type - resource type on which subscribe or publish [exchange/queue]
     * @param {String} routingKey - binding pattern
     * @return a string that represents the topic name for that channel
     */
    this.streamChannelTopicFor = (params = {}) => {
      const {
        deviceId = void 0,
        channel = void 0,
        type = this.defaultResource,
        routingKey = this.defaultPattern,
        topic = void 0
      } = params;
      let resource = deviceId || "";
      if (channel) {
        resource += `.${channel}`;
      }
      let finalTopic = resource;
      if (topic) {
        finalTopic += `.${topic}`;
      } else {
        finalTopic = routingKey;
      }
      return `/${type}/${resource}/${finalTopic}`;
    };
    /**
     * Generate the subscription string for cached live streams
     *
     * @private
     * @param {String} stream - stream name from which you want to stream
     * @param {String} type - resource type on which subscribe or publish [exchange/queue]
     * @return a string that represents the topic name for that channel
     */
    this.cachedStreamTopicFor = (params = {}) => {
      const { stream = void 0, type = this.existingQueuePrefix } = params;
      const topic = stream || "";
      return `/${type}/${topic}.${this.liveStreamSuffix}`;
    };
    /**
     * Generate the subscription for live streams without caching
     *
     * @private
     * @param {String} stream - stream name from which you want to stream
     * @param {String} type - resource type on which subscribe or publish [exchange/queue]
     * @param {String} routingKey - binding pattern
     * @return a string that represents the topic name for that channel
     */
    this.streamTopicFor = (params = {}) => {
      const { stream = void 0, type = this.defaultResource, routingKey = this.defaultPattern } = params;
      const resource = stream || "";
      return `/${type}/${resource}.${this.liveStreamSuffix}/${routingKey}`;
    };
    this.defaultPattern = "#";
    this.stompStreamListeners = {};
    this.on("connect", () => {
      void this.bindStompStreamListeners();
    });
    this.on("disconnect", () => {
      this.stompStreamListeners = {};
    });
  }
};
delete StompStreamClient.prototype.onMessage;
delete StompStreamClient.prototype.publish;
delete StompStreamClient.prototype.subcriptionFor;
delete StompStreamClient.prototype.destinationFor;
var stompStreamClient_default = StompStreamClient;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AmqpClient,
  AmqpStreamClient,
  Client,
  MqttClient,
  MqttStreamClient,
  StompClient,
  StompStreamClient,
  StreamClient
});
//# sourceMappingURL=spacebunny.js.map