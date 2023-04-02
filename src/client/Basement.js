
/* global assertNamespace, homeEmulator */

require('./common/NamespaceUtils.js');
require('./common/logging/LoggingSystem.js');

assertNamespace('homeEmulator');

homeEmulator.Basement = function Basement(bus) {

    var basementLightStateChanged = function basementLightStateChanged(message) {
        $('#basementTab #lamp').removeClass('lamp-on lamp-off');
        $('#basementTab #lamp').addClass(message.on ? 'lamp-on' : 'lamp-off');
    };

    var basementPumpStateChanged = function basementPumpStateChanged(message) {
        $('#basementTab #pumpState input').each((index, input) => {
            $(input).prop('checked', (input.value === (message.on ? 'on' : 'off')));
        });
    };

    $('#basementTab #lightControl input').click(event => {
        bus.sendCommand(homeEmulator.shared.topics.basement.lightSwitchChanged, {switch: event.delegateTarget.name, value: event.delegateTarget.value});
    });

    $('#basementTab #waterControl input').click(event => {
        bus.sendCommand(homeEmulator.shared.topics.basement.waterSensorChanged, {sensor: event.delegateTarget.name, value: event.delegateTarget.value});
    });

    bus.subscribeToPublication(homeEmulator.shared.topics.basement.light, basementLightStateChanged);
    bus.subscribeToPublication(homeEmulator.shared.topics.basement.pump,  basementPumpStateChanged);
};