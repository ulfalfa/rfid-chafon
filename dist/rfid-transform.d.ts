/// <reference types="node" />
import { Transform, TransformCallback } from 'stream';
export declare class ChafonParser extends Transform {
    _transform(chunk: any, encoding: string, callback: TransformCallback): void;
    _flush(callback: TransformCallback): void;
}
