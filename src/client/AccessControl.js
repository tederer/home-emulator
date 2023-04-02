
/* global assertNamespace, homeEmulator */

require('./common/NamespaceUtils.js');
require('./common/logging/LoggingSystem.js');

assertNamespace('homeEmulator');

homeEmulator.AccessControl = function AccessControl(bus) {
    var accessControlButtonClicked = function accessControlButtonClicked(buttonValue) {
        bus.sendCommand(homeEmulator.shared.topics.accessControl.buttonPressed, {value: buttonValue});
    };
    
    var accessControlGrantStateChanged = function accessControlGrantStateChanged(message) {
        $('#accessControlTab #statusLed').removeClass('led-red led-green');
        $('#accessControlTab #statusLed').addClass(message.granted ? 'led-green' : 'led-red');
    };

    var accessControlEnteredPinChanged = function accessControlEnteredPinChanged(message) {
        $('#accessControlTab #pinCode').val(message.pin);
    };

    $('#accessControlTab button').click(event => {
        accessControlButtonClicked(event.delegateTarget.value);
    });

    bus.subscribeToPublication(homeEmulator.shared.topics.accessControl.granted, accessControlGrantStateChanged);
    bus.subscribeToPublication(homeEmulator.shared.topics.accessControl.enteredPin, accessControlEnteredPinChanged);
};