/* global homeEmulator, assertNamespace */

require('./common/NamespaceUtils.js');

assertNamespace('homeEmulator.shared.topics.accessControl.');
assertNamespace('homeEmulator.shared.topics.basement');
assertNamespace('homeEmulator.shared.topics.kitchen');

//                PUBLICATIONS

/**
 * The server publishes on this topic if access is granted or not.
 *
 * example: {"granted" : true}
 */
homeEmulator.shared.topics.accessControl.granted = '/shared/accessControl/granted';

/**
 * The server publishes on this topic the entered PIN.
 *
 * example: {"pin" : "123"}
 */
homeEmulator.shared.topics.accessControl.enteredPin = '/shared/accessControl/enteredPin';


/**
 * The server publishes on this topic the state of the light in the basement.
 *
 * example: {"on" : true}
 */
homeEmulator.shared.topics.basement.light = '/shared/basement/light';


/**
 * The server publishes on this topic the state of the pump in the basement.
 *
 * example: {"on" : true}
 */
homeEmulator.shared.topics.basement.pump = '/shared/basement/pump';


/**
 * The server publishes on this topic the state of the up motor in the basement.
 *
 * example: {"on" : true}
 */
homeEmulator.shared.topics.kitchen.upMotor = '/shared/basement/upMotor';


/**
 * The server publishes on this topic the state of the up motor in the basement.
 *
 * example: {"on" : true}
 */
homeEmulator.shared.topics.kitchen.downMotor = '/shared/basement/downMotor';

//                COMMANDS

/**
 * The client sends this command for every pressed button of the access control tab. The sent data
 * contains a value of ["0" - "9", "ok", "cancel"].
 *
 * example: {"value": "1"}
 **/
homeEmulator.shared.topics.accessControl.buttonPressed = '/shared/accessControl/buttonPressed';


/**
 * The client sends this command for every change of a light switch.
 *
 * example: {"switch": "lightSwitch1", "value": "on"}
 **/
homeEmulator.shared.topics.basement.lightSwitchChanged = '/shared/basement/lightSwitchChanged';


/**
 * The client sends this command for every change of a water sensor.
 *
 * example: {"sensor": "sensorLow", "value": "on"}
 **/
homeEmulator.shared.topics.basement.waterSensorChanged = '/shared/basement/waterSensor';

/**
 * The client sends this command for every change of the up sensor sensor.
 *
 * example: {"value": "on"}
 **/
homeEmulator.shared.topics.kitchen.upSensorChanged = '/shared/kitchen/upSensor';

/**
 * The client sends this command for every change of the down sensor sensor.
 *
 * example: {"value": "off"}
 **/
homeEmulator.shared.topics.kitchen.downSensorChanged = '/shared/kitchen/downSensor';

/**
 * The client sends this command every time the up or down button gets pressed.
 *
 * example: {"value": "up"}
 **/
homeEmulator.shared.topics.kitchen.switchPressed = '/shard/kitchen/switchPressed';