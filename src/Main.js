/* global common, __dirname, process, homeEmulator */

require('./common/logging/LoggingSystem.js');
require('./common/infrastructure/bus/Bus.js');
require('./common/infrastructure/busbridge/ServerSocketIoBusBridge.js');
require('./Webserver.js');
require('./SharedTopics.js');
require('./MqttBroker.js');

const bus              = new common.infrastructure.bus.Bus();
const webserver        = new homeEmulator.Webserver();
   
const { Server }       = require('socket.io');
const io               = new Server(webserver.getHttpServer());
const LOGGER           = common.logging.LoggingSystem.createLogger('Main');
const topicsToTransmit = [  homeEmulator.shared.topics.accessControl.granted,
                            homeEmulator.shared.topics.accessControl.enteredPin,
                            homeEmulator.shared.topics.basement.light,
                            homeEmulator.shared.topics.basement.pump,
                            homeEmulator.shared.topics.kitchen.upMotor,
                            homeEmulator.shared.topics.kitchen.downMotor];

new common.infrastructure.busbridge.ServerSocketIoBusBridge(bus, topicsToTransmit, io);

var mqttBroker = new homeEmulator.MqttBroker();

// access control

var accessControlGrantStateChanged = function accessControlGrantStateChanged(data) {
    if ((typeof data === 'object') && (typeof data.granted === 'boolean')) {
        bus.publish(homeEmulator.shared.topics.accessControl.granted, data);
    } else {
        LOGGER.logError('received access control grant state message (' + JSON.stringify(data) + ') is invalid.');
    }
};

var accessControlEnteredPinChanged = function accessControlEnteredPinChanged(data) {
    if ((typeof data === 'object') && (typeof data.pin === 'string')) {
        bus.publish(homeEmulator.shared.topics.accessControl.enteredPin, data);
    } else {
        LOGGER.logError('received access control PIN message (' + JSON.stringify(data) + ') is invalid.');
    }
};

var accessControlButtonPressed = function accessControlButtonPressed(data) {
    mqttBroker.publish('/accessControl/buttonPressed', data, mqttBroker.DELIVERY_AT_MOST_ONCE);
};

mqttBroker.subscribe('/accessControl/granted',    accessControlGrantStateChanged, mqttBroker.DELIVERY_AT_LEAST_ONCE);
mqttBroker.subscribe('/accessControl/enteredPin', accessControlEnteredPinChanged, mqttBroker.DELIVERY_AT_LEAST_ONCE);

bus.subscribeToCommand(homeEmulator.shared.topics.accessControl.buttonPressed, accessControlButtonPressed);

// basement

var basementLightStateChanged = function basementLightStateChanged(data) {
    if ((typeof data === 'object') && (typeof data.on === 'boolean')) {
        bus.publish(homeEmulator.shared.topics.basement.light, data);
    } else {
        LOGGER.logError('received basement light state message (' + JSON.stringify(data) + ') is invalid.');
    }
};

var basementPumpStateChanged = function basementPumpStateChanged(data) {
    if ((typeof data === 'object') && (typeof data.on === 'boolean')) {
        bus.publish(homeEmulator.shared.topics.basement.pump, data);
    } else {
        LOGGER.logError('received basement pump state message (' + JSON.stringify(data) + ') is invalid.');
    }
};

var basementLightSwitchChanged = function basementLightSwitchChanged(data) {
    mqttBroker.publish('/basement/lightSwitchChanged', data, mqttBroker.DELIVERY_AT_MOST_ONCE);
};

var basementWaterSensorChanged = function basementWaterSensorChanged(data) {
    mqttBroker.publish('/basement/waterSensorChanged', data, mqttBroker.DELIVERY_AT_MOST_ONCE);
};

mqttBroker.subscribe('/basement/light', basementLightStateChanged, mqttBroker.DELIVERY_AT_LEAST_ONCE);
mqttBroker.subscribe('/basement/pump',  basementPumpStateChanged, mqttBroker.DELIVERY_AT_LEAST_ONCE);

bus.subscribeToCommand(homeEmulator.shared.topics.basement.lightSwitchChanged, basementLightSwitchChanged);
bus.subscribeToCommand(homeEmulator.shared.topics.basement.waterSensorChanged, basementWaterSensorChanged);

// kitchen

var kitchenUpSensorChanged = function kitchenUpSensorChanged(data) {
    mqttBroker.publish('/kitchen/upSensorChanged', data, mqttBroker.DELIVERY_AT_MOST_ONCE);
};

var kitchenDownSensorChanged = function kitchenDownSensorChanged(data) {
    mqttBroker.publish('/kitchen/downSensorChanged', data, mqttBroker.DELIVERY_AT_MOST_ONCE);
};

var kitchenSwitchSensorChanged = function kitchenSwitchSensorChanged(data) {
    mqttBroker.publish('/kitchen/switchPressed', data, mqttBroker.DELIVERY_AT_MOST_ONCE);
};

var kitchenUpMotorStateChanged = function kitchenUpMotorStateChanged(data) {
    if ((typeof data === 'object') && (typeof data.on === 'boolean')) {
        bus.publish(homeEmulator.shared.topics.kitchen.upMotor, data);
    } else {
        LOGGER.logError('received up motor state message (' + JSON.stringify(data) + ') is invalid.');
    }
};

var kitchenDownMotorStateChanged = function kitchenDownMotorStateChanged(data) {
    if ((typeof data === 'object') && (typeof data.on === 'boolean')) {
        bus.publish(homeEmulator.shared.topics.kitchen.downMotor, data);
    } else {
        LOGGER.logError('received up motor state message (' + JSON.stringify(data) + ') is invalid.');
    }
};

mqttBroker.subscribe('/kitchen/upMotor', kitchenUpMotorStateChanged, mqttBroker.DELIVERY_AT_LEAST_ONCE);
mqttBroker.subscribe('/kitchen/downMotor', kitchenDownMotorStateChanged, mqttBroker.DELIVERY_AT_LEAST_ONCE);


bus.subscribeToCommand(homeEmulator.shared.topics.kitchen.upSensorChanged, kitchenUpSensorChanged);
bus.subscribeToCommand(homeEmulator.shared.topics.kitchen.downSensorChanged, kitchenDownSensorChanged);
bus.subscribeToCommand(homeEmulator.shared.topics.kitchen.switchPressed, kitchenSwitchSensorChanged);
