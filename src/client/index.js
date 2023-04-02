/* global common, io, homeEmulator */

var showTab = function showTab(event) {
    var targetId     = event.target.id;
    var windowOpened = false;

    if (!windowOpened) {
        var tabs = $('body > div');

        for(var i = 0; i < tabs.length; i++) {
            var tab = tabs[i];
            if (tab.id.endsWith('Tab')) {
                if(tab.id === targetId + 'Tab') {
                $(tab).removeClass('d-none');
                } else {
                $(tab).addClass('d-none');
                }
            }
        }
    }

    $('.collapse').collapse('hide');
};

$(document).ready(function() {
    var bus              = new common.infrastructure.bus.Bus();
    var topicsToTransmit = [homeEmulator.shared.topics.accessControl.buttonPressed,
                            homeEmulator.shared.topics.basement.lightSwitchChanged,
                            homeEmulator.shared.topics.basement.waterSensorChanged,
                            homeEmulator.shared.topics.kitchen.upSensorChanged,
                            homeEmulator.shared.topics.kitchen.downSensorChanged,
                            homeEmulator.shared.topics.kitchen.switchPressed];
    
    new common.infrastructure.busbridge.ClientSocketIoBusBridge(bus, topicsToTransmit, io);

    $('#navbarToggler a').click(showTab);

    new homeEmulator.AccessControl(bus);
    new homeEmulator.Basement(bus);
    new homeEmulator.Kitchen(bus);
});
