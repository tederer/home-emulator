
var recursiveAssertObject = function recursiveAssertObject(parentObject, objects) {
   
   if (parentObject[objects[0]] === undefined) {
      parentObject[objects[0]] = {};  
   }
   
   var newParentObject = parentObject[objects[0]];
   
   if (objects.length > 1) {
      recursiveAssertObject(newParentObject, objects.slice(1));
   }
};

assertNamespace = function assertNamespace(namespace) {
   
   var rootObject = (typeof window === 'undefined') ? global : window;
   var objects = namespace.split('.');
   recursiveAssertObject(rootObject, objects);
};

assertNamespace('common.infrastructure.bus');

/**
 * A Bus enables components to communicate with each other by using publications and commands bound to topics. 
 * All the comminicating components need to know are the used topics -> they do not need to know each other.
 *
 * A topic (e.g. '/webapp/client/selectedCustomers') is a unique string that identifies the command and/or publication. 
 * The same topic can be used for commands and publications.
 *
 * When a component publishes some data on a topic, all components which subscribed to publications on that topic, will get
 * the published data. The bus remembers the last published data and provides them to components that subscribe later (late join).
 *
 * When a component sends a command on a topic, all components which subscribed to commands on that topic, will get
 * the data of the command. The bus does NOT remember command data -> later subscribing components will not get them (one shot).
 */
common.infrastructure.bus.Bus = (function () {

   var Bus = function Bus() {
      
      var publicationCallbacksPerTopic = {};
      var lastPublishedDataPerTopic = {};
      var commandCallbacksPerTopic = {};

      var add = function add(callback) {
         return { 
            relatedTo: function relatedTo(topic) {
               return {
                  to: function to(map) {
                     if (map[topic] === undefined) {
                        map[topic] = [];
                     }
                     var set = map[topic];
                     set[set.length] = callback;
                  }
               };
            }
         };
      }; 

      var invokeAllCallbacksOf = function invokeAllCallbacksOf(map) {
         return {
            ofType: function ofType(topic) {
               return {
                  withData: function withData(data) {
                     if (map[topic] !== undefined) {
                        map[topic].forEach(function(callback) {
                           callback(data);
                        });
                     }
                  }
               };
            }
         };
      };
      
      this.subscribeToPublication = function subscribeToPublication(topic, callback) {
         if(topic && (typeof callback === 'function')) {
            add(callback).relatedTo(topic).to(publicationCallbacksPerTopic);
            
            var lastPublishedData = lastPublishedDataPerTopic[topic];
            
            if (lastPublishedData) {
               callback(lastPublishedData);
            }
         }
      };
      
      this.subscribeToCommand = function subscribeToCommand(topic, callback) {
         if (topic && (typeof callback === 'function')) {
            add(callback).relatedTo(topic).to(commandCallbacksPerTopic);
         }
      };
      
      this.publish = function publish(topic, data) {
         lastPublishedDataPerTopic[topic] = data;
         invokeAllCallbacksOf(publicationCallbacksPerTopic).ofType(topic).withData(data);
      };
      
      this.sendCommand = function sendCommand(topic, data) {
         invokeAllCallbacksOf(commandCallbacksPerTopic).ofType(topic).withData(data);
      };
   };
   
   return Bus;
}());

assertNamespace('common.infrastructure.busbridge');

common.infrastructure.busbridge.CONNECTION_STATE_TOPIC = 'busbridge.connected';

/**
 * A BusBridge connects two busses by using a transport media (e.g. socket.io)
 * and it has the following responsibilities:
 *    1. transmit all commands and publications, the bridge is interested in, to the other bus
 *    2. publish all commands and publications received from the other bus
 *    3. publish the connection state of the bridge locally on the topic: 
 *            common.infrastructure.busbridge.CONNECTION_STATE_TOPIC
 */

/**
 * constructor for a BusBridge.
 *
 * bus                        the instance of the local common.infrastructure.bus.Bus
 * topicsToTransmit           an Array of topics that should get transmitted via the bridge
 * connectionFactoryFunction  a function that returns either a ClientSocketIoConnection or a ServerSocketIoConnection 
 *                              (located in common.infrastructure.busbridge.connection).
 */
common.infrastructure.busbridge.BusBridge = function BusBridge(bus, topicsToTransmit, connectionFactoryFunction) {

   var onConnectCallback = function onConnectCallback() {
      bus.publish(common.infrastructure.busbridge.CONNECTION_STATE_TOPIC, true);
   };
   
   var onDisconnectCallback = function onDisconnectCallback() {
      bus.publish(common.infrastructure.busbridge.CONNECTION_STATE_TOPIC, false);
   };
   
   var onMessageCallback = function onMessageCallback(message) {
      if (message.type === 'PUBLICATION') {
         bus.publish(message.topic, message.data);
      } else if (message.type === 'COMMAND') {
         bus.sendCommand(message.topic, message.data);
      }
   };

   var connection = connectionFactoryFunction(onConnectCallback, onDisconnectCallback, onMessageCallback);
   
   bus.publish(common.infrastructure.busbridge.CONNECTION_STATE_TOPIC, 'false');

   topicsToTransmit.forEach(function(topic) {
      bus.subscribeToPublication(topic, function(data) {
         var message = common.infrastructure.busbridge.MessageFactory.createPublicationMessage(topic, data);
         connection.send(message);
      });
      bus.subscribeToCommand(topic, function(data) {
         var message = common.infrastructure.busbridge.MessageFactory.createCommandMessage(topic, data);
         connection.send(message);
      });
   });
};
 

assertNamespace('common.infrastructure.busbridge');

/**
 * constructor for a bus bridge typically used in the browser.
 *
 * bus               the local bus instance
 * topicsToTransmit  an Array of topics that should get transmitted via the bridge
 * io                the socket.io instance
 */
common.infrastructure.busbridge.ClientSocketIoBusBridge = function ClientSocketIoBusBridge(bus, topicsToTransmit, io) {
   
   var clientConnectionFactoryFunction = function serverConnectionFactoryFunction(onConnectCallback, onDisconnectCallback, onMessageCallback) {
      return new common.infrastructure.busbridge.connection.ClientSocketIoConnection(io(), onConnectCallback, onDisconnectCallback, onMessageCallback);
   };

   this.prototype = new common.infrastructure.busbridge.BusBridge(bus, topicsToTransmit, clientConnectionFactoryFunction);
};


assertNamespace('common.infrastructure.busbridge.connection');

common.infrastructure.busbridge.connection.ClientSocketIoConnection = function ClientSocketIoConnection(socket, onConnectCallback, onDisconnectCallback, onMessageCallback) {
   
   var connected = false;
   
   var onMessage = function onMessage(rawMessage) {
      onMessageCallback(JSON.parse(rawMessage));
   };
   
   var onConnect = function onConnect() {
      connected = true;
      onConnectCallback();
   };
   
   var onDisconnect = function onDisconnect() {
      connected = false;
      onDisconnectCallback();
   };
   
   this.send = function send(data) {
      if (connected) {
         socket.emit('message', JSON.stringify(data));
      }
   };
   
   onDisconnectCallback();
   socket.on('connect', onConnect);
   socket.on('disconnect', onDisconnect);
   socket.on('message', onMessage);
};


assertNamespace('common.infrastructure.busbridge.connection');

common.infrastructure.busbridge.connection.ServerSocketIoConnection = function ServerSocketIoConnection(socketIoServer, onConnectCallback, onDisconnectCallback, onMessageCallback) {
   
   var sockets = [];
   var counter = 1;
   var latestPublicationMessagesByTopic = {};
   
   var Socket = function Socket(socketIoSocket, messageCallback, disconnectCallback) {
      
      this.id = counter++;
      var thisInstance = this;
      
      var onMessage = function onMessage(rawMessage) {
         messageCallback(rawMessage, thisInstance);
      };
      
      var onDisconnect = function onDisconnect() {
         socketIoSocket.removeListener('disconnect', onDisconnect);
         socketIoSocket.removeListener('message', onMessage);
         disconnectCallback(thisInstance);
      };
      
      this.send = function send(rawMessage) {
         socketIoSocket.emit('message', rawMessage);
      };
      
      socketIoSocket.on('disconnect', onDisconnect);
      socketIoSocket.on('message', onMessage);
   };
   
   var onMessage = function onMessage(rawMessage, sendingSocket) {
      var message = JSON.parse(rawMessage);
      onMessageCallback(message);
      
      if (message.type === 'PUBLICATION') {
         latestPublicationMessagesByTopic[message.topic] = message;
      }
   };
   
   var onDisconnect = function onDisconnect(disconnectedSocket) {
      var indexToDelete = sockets.indexOf(disconnectedSocket);
      
      if (indexToDelete >= 0) {
         sockets.splice(indexToDelete, 1);
      }
      
      if (sockets.length === 0) {
         onDisconnectCallback();
      }
   };
   
   var onConnection = function onConnection(newSocketIoSocket) {
      var newSocket = new Socket(newSocketIoSocket, onMessage, onDisconnect);
      sockets[sockets.length] = newSocket;
      
      if (sockets.length === 1) {
         onConnectCallback();
      }
      
      var topics = Object.keys(latestPublicationMessagesByTopic);
      topics.forEach(function(topic) {
         newSocket.send(JSON.stringify(latestPublicationMessagesByTopic[topic]));
      });
   };
   
   this.send = function send(message) {
      var serializedMessage = JSON.stringify(message);
      sockets.forEach(function(socket) { socket.send(serializedMessage); });
      
      if (message.type === 'PUBLICATION') {
         latestPublicationMessagesByTopic[message.topic] = message;
      }
   };

   socketIoServer.on('connection', onConnection);
};


assertNamespace('common.infrastructure.busbridge');

common.infrastructure.busbridge.MessageFactory = {
   
   createPublicationMessage: function createPublicationMessage(topic, data) {
      return {
         type: 'PUBLICATION',
         topic: topic,
         data: data
      };
   },
   
   createCommandMessage: function createCommandMessage(topic, data) {
      return {
         type: 'COMMAND',
         topic: topic,
         data: data
      };
   }
};


assertNamespace('common.infrastructure.busbridge');

/**
 * constructor for a bus bridge used where the https server is running.
 *
 * bus               the local bus instance
 * topicsToTransmit  an Array of topics that should get transmitted via the bridge
 * io                the socket.io instance
 */
common.infrastructure.busbridge.ServerSocketIoBusBridge = function ServerSocketIoBusBridge(bus, topicsToTransmit, io) {
   
   var serverConnectionFactoryFunction = function serverConnectionFactoryFunction(onConnectCallback, onDisconnectCallback, onMessageCallback) {
      return new common.infrastructure.busbridge.connection.ServerSocketIoConnection(io, onConnectCallback, onDisconnectCallback, onMessageCallback);
   };

   this.prototype = new common.infrastructure.busbridge.BusBridge(bus, topicsToTransmit, serverConnectionFactoryFunction);
};



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