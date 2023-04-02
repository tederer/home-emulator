
/* global assertNamespace, homeEmulator */

require('./common/NamespaceUtils.js');
require('./common/logging/LoggingSystem.js');

assertNamespace('homeEmulator');

homeEmulator.Kitchen = function Kitchen(bus) {

    var kitchenUpMotor1StateChanged = function kitchenUpMotor1StateChanged(message) {
        $('#kitchenTab #blindMotor1 input').each((index, input) => {
            $(input).prop('checked', (input.value === (message.on ? 'on' : 'off')));
        });
    };

    var kitchenDowMotor2StateChanged = function kitchenDowMotor2StateChanged(message) {
        $('#kitchenTab #blindMotor2 input').each((index, input) => {
            $(input).prop('checked', (input.value === (message.on ? 'on' : 'off')));
        });
    };

    $('#kitchenTab #upSensor input').click(event => {
        bus.sendCommand(homeEmulator.shared.topics.kitchen.upSensorChanged, {value: event.delegateTarget.value});
    });

    $('#kitchenTab #downSensor input').click(event => {
        bus.sendCommand(homeEmulator.shared.topics.kitchen.downSensorChanged, {value: event.delegateTarget.value});
    });

    $('#kitchenTab #switches button').click(event => {
        bus.sendCommand(homeEmulator.shared.topics.kitchen.switchPressed, {value: event.delegateTarget.value});
    });


    bus.subscribeToPublication(homeEmulator.shared.topics.kitchen.upMotor, kitchenUpMotor1StateChanged);
    bus.subscribeToPublication(homeEmulator.shared.topics.kitchen.downMotor, kitchenDowMotor2StateChanged);
};