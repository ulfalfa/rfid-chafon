/// <reference types="node" />
import * as SerialPort from 'serialport';
import { EventEmitter } from 'events';
import { ChafonParser } from './rfid-transform';
export declare class RFID extends EventEmitter {
    _readInterval: any;
    serialPort: SerialPort;
    parser: ChafonParser;
    constructor(port?: string);
    beep(): Promise<{}>;
    read(): Promise<{}>;
    atomicWrite(id: any): Promise<{}>;
    write(id: any): Promise<{}>;
    getInfo(): Promise<{}>;
    open(): Promise<{}>;
    close(): void;
    startReading(interval?: number): Promise<void>;
    stopReading(): void;
}
