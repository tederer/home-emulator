/* global assertNamespace, common, process, homeEmulator */

const { connect } = require('mqtt');

require('./common/NamespaceUtils.js');
require('./common/logging/LoggingSystem.js');

assertNamespace('homeEmulator');

// https://github.com/mqttjs/MQTT.js
// https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html

homeEmulator.MqttBroker = function MqttBroker() {
    const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL;
    const LOGGER          = common.logging.LoggingSystem.createLogger('MqttBroker');

    var thisInstance  = this;
    var mqtt          = require('mqtt');
    var connected     = false;
    var subscriptions = {};
    var client;

    if (typeof MQTT_BROKER_URL !== 'string') {
        LOGGER.logError('missing environment variable MQTT_BROKER_URL');
        process.exit(1);
    }
   
    this.DELIVERY_AT_MOST_ONCE  = {qos: 0};
    this.DELIVERY_AT_LEAST_ONCE = {qos: 1};
    this.DELIVERY_EXACTLY_ONCE  = {qos: 2};

    var connectionLost = function connectionLost(eventDescription) {
        return () => {
            if (connected) {
                LOGGER.logError(eventDescription + ' event received -> closing connection');
                connected = false;
            } else {
                LOGGER.logInfo(eventDescription + ' event received in disconnected state');
            }
        };
    };

    var processMessage = function processMessage(topic, message) {
        LOGGER.logInfo('received (topic=' + topic + ', message=' + message.toString() + ')');
        var data;
        try {
            data = JSON.parse(message);
        } catch (error) {
            LOGGER.logError('failed to parse message: ' + error);
        }

        (subscriptions[topic] ?? []).forEach(subscription => {
            subscription.callback(data);
        });
    };

    var renewSubscriptions = function renewSubscriptions() {
        if (connected) {
            Object.keys(subscriptions).forEach(topic => {
                subscriptions[topic].forEach(subscription => {
                    client.subscribe(subscription.topic, subscription.options, error => {
                        if (error) {
                            LOGGER.logError('failed to subscribe to (topic=' + subscription.topic +  ', options=' + JSON.stringify(subscription.options) + '): ' + error);
                        } else {
                            LOGGER.logInfo('subscribed to (topic=' + subscription.topic +  ', options=' + JSON.stringify(subscription.options) + ')');
                        }
                    });
                });
            });
        }
    };

    this.publish = function publish(topic, message, options) {
        if (!connected) {
            LOGGER.logDebug('ignoring request to pubish message on topic "' + topic + '" because not connected');
            return;
        }
        if (options === undefined) {
            options = thisInstance.DELIVERY_AT_MOST_ONCE;
        }
        client.publish(topic, JSON.stringify(message), options);
        LOGGER.logInfo('published (topic=' + topic +  ', options=' + JSON.stringify(options) + ', message=' + JSON.stringify(message) + ')');
    };

    this.subscribe = function subscribe(topic, callback, options) {
        if (options === undefined) {
            options = thisInstance.DELIVERY_AT_MOST_ONCE;
        }
        
        if (subscriptions[topic] === undefined) {
            subscriptions[topic] = [];
        }

        subscriptions[topic].push({topic: topic, callback: callback, options: options});
        renewSubscriptions();
    };

    LOGGER.logInfo('connecting to MQTT broker (' + MQTT_BROKER_URL + ') ...');
    client = mqtt.connect(MQTT_BROKER_URL);

    client.on('close',      connectionLost('close'));
    client.on('disconnect', connectionLost('disconnect'));
    client.on('offline',    connectionLost('offline'));
    client.on('error', error => {
        LOGGER.logError('error event received: ' + error);
        connectionLost('error');
    });

    client.on('message', processMessage);

    client.on('connect', function () {
        LOGGER.logInfo('connected to MQTT broker');
        connected = true;
        //thisInstance.publish('/fridge/temperature', 'Hello mqtt from node.js', {qos: 1});
        //thisInstance.subscribe('/foo/bar', {qos:1});
        renewSubscriptions();
    });
};