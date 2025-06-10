class CableManager {
    constructor() {
        this.selectedCableType = null;
        this.selectedNetworkColor = null;
        this.startElement = null;
        this.cables = [];
        this.powerConnections = new Map();
        this.powerStrips = new Map();
        this.connectedPorts = new Set();
        this.switchLedTimers = new Map();
        this.switchStates = new Map();
        this.computerPorts = new Map();
        this.patchPanelConnections = new Map();
        this.internetPortBlinkTimers = new Map();
        this.internetPorts = new Set([12, 18]);
        
        this.initializeComputerConnections();
        
        document.querySelectorAll('.switch').forEach(switchEl => {
            this.switchStates.set(switchEl.id, {
                element: switchEl,
                powered: false,
                connection: null,
                portConnections: new Map()
            });
        });
        
        this.initializeCableTypes();
        this.initializePortListeners();
        this.initializePowerStrips();
        this.initializeSwitches();
        this.initializeComputers();
        this.setupMouseTracking();
    }

    initializeComputerConnections() {
        const computers = document.querySelectorAll('.computer');
        let leftLenovo, rightLenovo, leftAcer, rightAcer, leftDell, rightDell;

        computers.forEach((computer, index) => {
            if (computer.classList.contains('lenovo')) {
                if (!leftLenovo) {
                    leftLenovo = computer;
                    this.computerPorts.set(computer, {
                        eth0: 8,
                        eth1: 7
                    });
                    this.patchPanelConnections.set(7, { computer: computer, interface: 'eth1' });
                    this.patchPanelConnections.set(8, { computer: computer, interface: 'eth0' });
                } else {
                    rightLenovo = computer;
                    this.computerPorts.set(computer, {
                        eth0: 14,
                        eth1: 13
                    });
                    this.patchPanelConnections.set(13, { computer: computer, interface: 'eth1' });
                    this.patchPanelConnections.set(14, { computer: computer, interface: 'eth0' });
                }
            } else if (computer.classList.contains('acer')) {
                if (!leftAcer) {
                    leftAcer = computer;
                    this.computerPorts.set(computer, {
                        eth0: 9
                    });
                    this.patchPanelConnections.set(9, { computer: computer, interface: 'eth0' });
                } else if (!rightAcer) {
                    rightAcer = computer;
                    this.computerPorts.set(computer, {
                        eth0: 15
                    });
                    this.patchPanelConnections.set(15, { computer: computer, interface: 'eth0' });
                }
            } else if (computer.classList.contains('dell')) {
                if (!leftDell) {
                    leftDell = computer;
                    this.computerPorts.set(computer, {
                        eth0: 10
                    });
                    this.patchPanelConnections.set(10, { computer: computer, interface: 'eth0' });
                } else {
                    rightDell = computer;
                    this.computerPorts.set(computer, {
                        eth0: 16
                    });
                    this.patchPanelConnections.set(16, { computer: computer, interface: 'eth0' });
                }
            }
        });
    }

    initializeCableTypes() {
        const cableTypes = document.querySelectorAll('.cable-type');
        const colorOptions = document.querySelectorAll('.color-option');

        cableTypes.forEach(type => {
            type.addEventListener('click', () => {
                if (type.classList.contains('active')) {
                    this.selectedCableType = null;
                    type.classList.remove('active');
                    return;
                }

                cableTypes.forEach(t => t.classList.remove('active'));
                
                this.selectedCableType = type.dataset.cableType;
                type.classList.add('active');

                if (this.selectedCableType !== 'network') {
                    this.selectedNetworkColor = null;
                    colorOptions.forEach(c => c.classList.remove('active'));
                }
            });
        });

        colorOptions.forEach(color => {
            color.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.selectedCableType !== 'network') return;

                colorOptions.forEach(c => c.classList.remove('active'));
                color.classList.add('active');
                this.selectedNetworkColor = color.dataset.color;
            });
        });
    }

    initializePortListeners() {
        document.querySelectorAll('.port.rj45').forEach(port => {
            port.addEventListener('click', () => {
                if (this.selectedCableType === 'network') {
                    this.handlePortClick(port);
                }
            });
        });
    }

    initializePowerStrips() {
        const strips = document.querySelectorAll('.power-strip');
        strips.forEach((strip, index) => {
            const switchBtn = strip.querySelector('.strip-switch');
            this.powerStrips.set(strip, false);

            switchBtn.addEventListener('click', () => {
                const isOn = !this.powerStrips.get(strip);
                this.powerStrips.set(strip, isOn);
                switchBtn.classList.toggle('on', isOn);
                
                this.updateComputersPowerState();
            });
        });
    }

    initializeSwitches() {
        this.switchStates.forEach((state, switchId) => {
            const switchEl = state.element;
            const powerPort = switchEl.querySelector('.power-port');
            
            powerPort.addEventListener('click', (e) => {
                if (this.selectedCableType === 'power') {
                    if (this.connectedPorts.has(powerPort)) {
                        this.removeCable(powerPort);
                        return;
                    }

                    if (this.startElement) {
                        if (!this.connectedPorts.has(this.startElement) && !this.connectedPorts.has(powerPort)) {
                            this.connectElements(this.startElement, powerPort);
                        }
                        this.startElement = null;
                    } else {
                        this.startElement = powerPort;
                    }
                }
            });
        });
    }

    initializeComputers() {
        const computers = document.querySelectorAll('.computer');
        computers.forEach(computer => {
            const powerBtn = computer.querySelector('.power-btn');
            const powerPort = computer.querySelector('.power-port');

            powerPort.addEventListener('click', (e) => {
                if (this.selectedCableType === 'power') {
                    if (this.connectedPorts.has(powerPort)) {
                        this.removeCable(powerPort);
                        return;
                    }

                    if (this.startElement) {
                        if (!this.connectedPorts.has(this.startElement) && !this.connectedPorts.has(powerPort)) {
                            this.connectElements(this.startElement, powerPort);
                        }
                        this.startElement = null;
                    } else {
                        this.startElement = powerPort;
                    }
                }
            });

            powerBtn.addEventListener('click', () => {
                if (this.canComputerPowerOn(computer)) {
                    powerBtn.classList.toggle('on');
                    computer.classList.toggle('powered');
                    this.switchStates.forEach((state, switchId) => {
                        if (state.powered) {
                            state.portConnections.forEach((patchPort, switchPort) => {
                                if (patchPort.isBottom) {
                                    const computerConnection = this.patchPanelConnections.get(patchPort.number);
                                    if (computerConnection && computerConnection.computer === computer) {
                                        setTimeout(() => {
                                            this.updateSwitchPortLED(switchId, switchPort);
                                        }, 1000);
                                    }
                                }
                            });
                        }
                    });
                }
            });
        });

        document.querySelectorAll('.socket.real').forEach(socket => {
            socket.addEventListener('click', (e) => {
                if (this.selectedCableType === 'power') {
                    if (this.connectedPorts.has(socket)) {
                        this.removeCable(socket);
                        return;
                    }

                    if (this.startElement) {
                        if (!this.connectedPorts.has(this.startElement) && !this.connectedPorts.has(socket)) {
                            this.connectElements(this.startElement, socket);
                        }
                        this.startElement = null;
                    } else {
                        this.startElement = socket;
                    }
                }
            });
        });
    }

    handlePortClick(port) {
        if (this.connectedPorts.has(port)) {
            this.removeCable(port);
            return;
        }

        if (this.startElement) {
            if (!this.connectedPorts.has(this.startElement) && !this.connectedPorts.has(port)) {
                if (this.selectedCableType === 'network') {
                    const isRJ45Start = this.startElement.classList.contains('rj45');
                    const isRJ45End = port.classList.contains('rj45');
                    if (isRJ45Start && isRJ45End && this.selectedNetworkColor) {
                        this.connectElements(this.startElement, port);
                    }
                } else if (this.selectedCableType === 'power') {
                    this.connectElements(this.startElement, port);
                }
            }
            this.startElement = null;
        } else {
            this.startElement = port;
        }
    }

    setupMouseTracking() {
        const tempCable = document.createElement('div');
        tempCable.className = 'cable';
        document.body.appendChild(tempCable);
        tempCable.style.display = 'none';

        document.addEventListener('mousemove', (e) => {
            if (this.startElement && this.selectedCableType) {
                if (this.selectedCableType === 'network' && !this.selectedNetworkColor) {
                    return;
                }

                const rect = this.startElement.getBoundingClientRect();
                const startX = rect.left + rect.width / 2;
                const startY = rect.top + rect.height / 2;
                
                tempCable.style.display = 'block';
                tempCable.style.left = startX + 'px';
                tempCable.style.top = startY + 'px';
                
                const length = Math.sqrt(
                    Math.pow(e.clientX - startX, 2) + 
                    Math.pow(e.clientY - startY, 2)
                );
                
                const angle = Math.atan2(
                    e.clientY - startY,
                    e.clientX - startX
                );
                
                tempCable.style.width = length + 'px';
                tempCable.style.transform = `rotate(${angle}rad)`;
                tempCable.className = `cable ${this.selectedCableType} ${this.selectedNetworkColor || ''}`;
            } else {
                tempCable.style.display = 'none';
            }
        });

        document.addEventListener('contextmenu', (e) => {
            if (this.startElement) {
                e.preventDefault();
                this.startElement = null;
                tempCable.style.display = 'none';
            }
        });
    }

    connectElements(start, end) {
        const cable = document.createElement('div');
        cable.className = `cable ${this.selectedCableType} ${this.selectedNetworkColor || ''}`;
        document.body.appendChild(cable);

        const updateCablePosition = () => {
            const startRect = start.getBoundingClientRect();
            const endRect = end.getBoundingClientRect();
            
            const startX = startRect.left + startRect.width / 2;
            const startY = startRect.top + startRect.height / 2;
            const endX = endRect.left + endRect.width / 2;
            const endY = endRect.top + endRect.height / 2;
            
            const length = Math.sqrt(
                Math.pow(endX - startX, 2) + 
                Math.pow(endY - startY, 2)
            );
            
            const angle = Math.atan2(
                endY - startY,
                endX - startX
            );
            
            cable.style.left = startX + 'px';
            cable.style.top = startY + 'px';
            cable.style.width = length + 'px';
            cable.style.transform = `rotate(${angle}rad)`;
        };

        updateCablePosition();

        if (this.selectedCableType === 'power') {
            const switchEl = start.closest('.switch') || end.closest('.switch');
            const socket = start.closest('.socket') || end.closest('.socket');
            const computer = start.closest('.computer') || end.closest('.computer');
            
            if (computer && socket) {
                this.powerConnections.set(computer, {
                    socket: socket,
                    strip: socket.closest('.power-strip'),
                    cable: cable
                });
                socket.classList.add('connected');
                this.updateComputersPowerState();
            } else if (switchEl && socket) {
                const switchId = switchEl.id;
                const switchState = this.switchStates.get(switchId);
                if (switchState) {
                    switchState.connection = {
                        socket: socket,
                        strip: socket.closest('.power-strip'),
                        cable: cable
                    };
                    socket.classList.add('connected');
                    this.updateSwitchPowerState(switchId);
                }
            }
        }

        if (this.selectedCableType === 'network') {
            let switchPort = null;
            let patchPortInfo = null;
            
            if (start.classList.contains('rj45') && end.classList.contains('rj45')) {
                const startPortGroup = start.closest('.port-group');
                const endPortGroup = end.closest('.port-group');
                
                if (startPortGroup.closest('.switch')) {
                    switchPort = startPortGroup;
                    patchPortInfo = this.getPatchPanelPort(end);
                } else if (endPortGroup.closest('.switch')) {
                    switchPort = endPortGroup;
                    patchPortInfo = this.getPatchPanelPort(start);
                }
            }
            
            if (switchPort && patchPortInfo) {
                const switchEl = switchPort.closest('.switch');
                if (switchEl) {
                    const switchId = switchEl.id;
                    const switchState = this.switchStates.get(switchId);
                    const portNumber = parseInt(switchPort.querySelector('.port-number').textContent);
                    
                    if (!isNaN(portNumber) && switchState) {
                        switchState.portConnections.set(portNumber, patchPortInfo);
                        
                        setTimeout(() => {
                            this.updateSwitchPortLED(switchId, portNumber);
                        }, 1000);
                    }
                }
            }
        }

        this.cables.push({
            element: cable,
            start: start,
            end: end,
            type: this.selectedCableType,
            color: this.selectedNetworkColor,
            updatePosition: updateCablePosition
        });
        
        this.connectedPorts.add(start);
        this.connectedPorts.add(end);

        window.addEventListener('resize', () => {
            this.cables.forEach(c => c.updatePosition());
        });
    }

    getPatchPanelPort(element) {
        if (!element) return null;
        const portGroup = element.closest('.port-group');
        if (!portGroup) return null;
        
        const patchPanel = portGroup.closest('.patchpanel');
        const isBottomPanel = patchPanel && patchPanel.classList.contains('bottom');
        
        const portNumber = parseInt(portGroup.querySelector('.port-number').textContent);
        if (isNaN(portNumber)) return null;
        
        return {
            number: portNumber,
            isBottom: isBottomPanel
        };
    }

    updateSwitchPortLED(switchId, portNumber) {
        const switchState = this.switchStates.get(switchId);
        if (!switchState || !switchState.powered) {
            return;
        }

        const patchPortInfo = switchState.portConnections.get(portNumber);
        if (!patchPortInfo) {
            return;
        }

        let isConnectedToSwitch = false;
        this.switchStates.forEach((otherSwitchState, otherSwitchId) => {
            if (otherSwitchId !== switchId && otherSwitchState.powered) {
                otherSwitchState.portConnections.forEach((otherPatchPort, otherPortNumber) => {
                    if (patchPortInfo &&
                        otherPatchPort &&
                        patchPortInfo.number === otherPatchPort.number &&
                        patchPortInfo.isBottom === otherPatchPort.isBottom) {
                        isConnectedToSwitch = true;
                        const otherLed = otherSwitchState.element.querySelector(`.led[data-led="${otherPortNumber}"]`);
                        if (otherLed) {
                            otherLed.classList.add('on');
                        }
                        const thisLed = switchState.element.querySelector(`.led[data-led="${portNumber}"]`);
                        if (thisLed) {
                            thisLed.classList.add('on');
                        }
                    }
                });
            }
        });

        if (!isConnectedToSwitch) {
            if (patchPortInfo.isBottom && this.internetPorts.has(patchPortInfo.number)) {
                const led = switchState.element.querySelector(`.led[data-led="${portNumber}"]`);
                if (led) {
                    const blinkKey = `${switchId}-${portNumber}`;
                    if (!this.internetPortBlinkTimers.has(blinkKey)) {
                        const blink = () => {
                            if (!switchState.connection) return;
                            const stayTime = Math.random() * 500;
                            led.classList.toggle('on');
                            if (switchState.connection) {
                                this.internetPortBlinkTimers.set(blinkKey, 
                                    setTimeout(blink, stayTime)
                                );
                            }
                        };
                        blink();
                    }
                }
            } else if (patchPortInfo.isBottom) {
                const portNum = patchPortInfo.number;
                const computerConnection = this.patchPanelConnections.get(portNum);
                
                if (computerConnection) {
                    const computer = computerConnection.computer;
                    if (computer) {
                        const isComputerPowered = computer.classList.contains('powered');
                        const led = switchState.element.querySelector(`.led[data-led="${portNumber}"]`);
                        if (led) {
                            if (isComputerPowered) {
                                led.classList.add('on');
                            } else {
                                led.classList.remove('on');
                            }
                        }
                    }
                }
            }
        }
    }

    clearSwitchLeds(switchId) {
        this.internetPortBlinkTimers.forEach((timer, key) => {
            if (key.startsWith(switchId)) {
                clearTimeout(timer);
                this.internetPortBlinkTimers.delete(key);
            }
        });

        const timers = this.switchLedTimers.get(switchId);
        if (timers) {
            timers.forEach(timer => clearTimeout(timer));
            this.switchLedTimers.delete(switchId);
        }

        const switchState = this.switchStates.get(switchId);
        if (switchState?.blinkTimer) {
            clearTimeout(switchState.blinkTimer);
            switchState.blinkTimer = null;
        }

        const switchEl = switchState?.element;
        if (switchEl) {
            const allLeds = switchEl.querySelectorAll('.led');
            allLeds.forEach(led => led.classList.remove('on'));
        }
    }

    removeCable(port) {
        const cableInfo = this.cables.find(c => c.start === port || c.end === port);
        if (!cableInfo) return;

        cableInfo.element.remove();
        
        this.cables = this.cables.filter(c => c !== cableInfo);
        this.connectedPorts.delete(cableInfo.start);
        this.connectedPorts.delete(cableInfo.end);

        if (cableInfo.type === 'power') {
            const computer = port.closest('.computer');
            const switchEl = port.closest('.switch');
            const socket = port.closest('.socket');
            
            if (computer) {
                const connection = this.powerConnections.get(computer);
                if (connection) {
                    connection.socket.classList.remove('connected');
                    this.powerConnections.delete(computer);
                }
            } else if (switchEl) {
                const switchId = switchEl.id;
                const switchState = this.switchStates.get(switchId);
                if (switchState) {
                    const socket = switchState.connection?.socket;
                    if (socket) {
                        socket.classList.remove('connected');
                    }
                    switchState.connection = null;
                    switchState.powered = false;
                    this.clearSwitchLeds(switchId);
                }
            } else if (socket) {
                for (const [computer, connection] of this.powerConnections) {
                    if (connection.socket === socket) {
                        this.powerConnections.delete(computer);
                        socket.classList.remove('connected');
                    }
                }
                
                for (const [switchId, state] of this.switchStates) {
                    if (state.connection?.socket === socket) {
                        state.connection = null;
                        state.powered = false;
                        socket.classList.remove('connected');
                        this.clearSwitchLeds(switchId);
                    }
                }
            }
        } else if (cableInfo.type === 'network') {
            this.switchStates.forEach((state, switchId) => {
                state.portConnections.forEach((patchPort, switchPort) => {
                    const startPortInfo = this.getPatchPanelPort(cableInfo.start);
                    const endPortInfo = this.getPatchPanelPort(cableInfo.end);
                    
                    if ((startPortInfo && startPortInfo.number === patchPort.number && startPortInfo.isBottom === patchPort.isBottom) || 
                        (endPortInfo && endPortInfo.number === patchPort.number && endPortInfo.isBottom === patchPort.isBottom)) {
                        state.portConnections.delete(switchPort);
                        const led = state.element.querySelector(`.led[data-led="${switchPort}"]`);
                        if (led) {
                            led.classList.remove('on');
                            const blinkKey = `${switchId}-${switchPort}`;
                            if (this.internetPortBlinkTimers.has(blinkKey)) {
                                clearTimeout(this.internetPortBlinkTimers.get(blinkKey));
                                this.internetPortBlinkTimers.delete(blinkKey);
                            }
                        }
                    }
                });
            });
        }

        this.updateComputersPowerState();
    }

    updateComputersPowerState() {
        document.querySelectorAll('.computer').forEach(computer => {
            const powerBtn = computer.querySelector('.power-btn');
            const canPower = this.canComputerPowerOn(computer);
            
            const wasPowered = computer.classList.contains('powered');
            powerBtn.classList.toggle('can-power', canPower);
            
            if (!canPower && powerBtn.classList.contains('on')) {
                powerBtn.classList.remove('on');
                computer.classList.remove('powered');
                this.switchStates.forEach((state, switchId) => {
                    if (state.powered) {
                        state.portConnections.forEach((patchPort, switchPort) => {
                            if (patchPort.isBottom) {
                                const computerConnection = this.patchPanelConnections.get(patchPort.number);
                                if (computerConnection && computerConnection.computer === computer) {
                                    const led = state.element.querySelector(`.led[data-led="${switchPort}"]`);
                                    if (led) {
                                        led.classList.remove('on');
                                    }
                                }
                            }
                        });
                    }
                });
            }
        });

        this.switchStates.forEach((state, switchId) => {
            if (state.connection) {
                this.updateSwitchPowerState(switchId);
            }
        });
    }

    updateSwitchPowerState(switchId) {
        const switchState = this.switchStates.get(switchId);
        if (!switchState || !switchState.connection) {
            this.clearSwitchLeds(switchId);
            switchState.powered = false;
            if (switchState) {
                switchState.portConnections.forEach((patchPort, switchPort) => {
                    const led = switchState.element.querySelector(`.led[data-led="${switchPort}"]`);
                    if (led) {
                        led.classList.remove('on');
                        led.classList.remove('yellow');
                        led.classList.remove('green');
                    }
                });
            }
            return;
        }

        const stripPowered = this.powerStrips.get(switchState.connection.strip);
        if (stripPowered) {
            if (!switchState.powered) {
                this.clearSwitchLeds(switchId);

                const pwrLed = switchState.element.querySelector('.led[data-led="PWR"]');
                const sysLed = switchState.element.querySelector('.led[data-led="SYS"]');

                const pwrTimer = setTimeout(() => {
                    if (switchState.connection) {
                        pwrLed.classList.add('on');
                    }
                }, 2000);

                const sysTimer = setTimeout(() => {
                    if (switchState.connection) {
                        const blink = () => {
                            if (!switchState.connection) return;
                            const stayTime = Math.random() * 1000;
                            sysLed.classList.toggle('on');
                            if (switchState.connection) {
                                switchState.blinkTimer = setTimeout(blink, stayTime);
                            }
                        };
                        blink();

                        setTimeout(() => {
                            if (switchState.connection) {
                                const portLeds = Array.from({length: 8}, (_, i) => 
                                    switchState.element.querySelector(`.led[data-led="${i + 1}"]`)
                                ).filter(led => led);

                                portLeds.forEach(led => {
                                    led.classList.remove('on');
                                    led.classList.add('yellow');
                                });

                                setTimeout(() => {
                                    if (switchState.connection) {
                                        portLeds.forEach(led => {
                                            led.classList.remove('yellow');
                                            led.classList.add('green');
                                        });

                                        setTimeout(() => {
                                            if (switchState.connection) {
                                                portLeds.forEach(led => {
                                                    led.classList.remove('green');
                                                    led.classList.remove('on');
                                                });

                                                setTimeout(() => {
                                                    if (switchState.connection) {
                                                        switchState.portConnections.forEach((patchPort, switchPort) => {
                                                            this.updateSwitchPortLED(switchId, switchPort);
                                                        });
                                                    }
                                                }, 1000);
                                            }
                                        }, 1500);
                                    }
                                }, 1500);
                            }
                        }, 1500);
                    }
                }, 3000);

                this.switchLedTimers.set(switchId, [pwrTimer, sysTimer]);
                switchState.powered = true;
            }
        } else {
            this.clearSwitchLeds(switchId);
            switchState.powered = false;
            switchState.portConnections.forEach((patchPort, switchPort) => {
                const led = switchState.element.querySelector(`.led[data-led="${switchPort}"]`);
                if (led) {
                    led.classList.remove('on');
                    led.classList.remove('yellow');
                    led.classList.remove('green');
                }
            });
        }
    }

    canComputerPowerOn(computer) {
        const connection = this.powerConnections.get(computer);
        if (!connection) return false;
        
        const stripPowered = this.powerStrips.get(connection.strip);
        return stripPowered;
    }

    updateSwitchLEDsForComputer(computer) {
        this.switchStates.forEach((state, switchId) => {
            if (state.powered) {
                state.portConnections.forEach((patchPort, switchPort) => {
                    const connection = this.patchPanelConnections.get(patchPort);
                    if (connection && connection.computer === computer) {
                        this.updateSwitchPortLED(switchId, switchPort);
                    }
                });
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CableManager();
});