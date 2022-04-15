export type Options = {
    /**
     * - global timeout for a command. When a command should fail even if it is still waiting for a response.
     */
    timeout: number;
    /**
     * - Number of times to try sending a command if no response was received.
     */
    retries: number;
    /**
     * - Timeout for a new send of the same command.
     */
    retryTimeout: number;
};
/**
 * @typedef Options
 * @type {object}
 * @property {number} timeout - global timeout for a command. When a command should fail even if it is still waiting for a response.
 * @property {number} retries - Number of times to try sending a command if no response was received.
 * @property {number} retryTimeout - Timeout for a new send of the same command.
 */
/**
 * The entry point to interact with Sensor Area Network
 * @class
 */
export class SensorArea {
    constructor(port: any);
    port: any;
    parser: CommandPacketParser;
    /**
     * Issue a short command to a specific sensor.
     *
     * @param {number} address
     * @param {number} command
     * @param {Array} arg
     * @param {Options} [options = { timeout: MAX_INT, retries: MAX_INT, retryTimeout: MAX_INT }]
     *
     * @returns {Promise} Promise object represents the completition of the command
     */
    shortCommand(address: number, command: number, arg: any[], options?: Options): Promise<any>;
    /**
     * Issue a short query command to a specific sensor.
     *
     * @param {number} address
     * @param {number} command
     * @param {Array} arg
     * @param {Options} [options = { timeout: MAX_INT, retries: MAX_INT, retryTimeout: MAX_INT }]
     *
     * @returns {Promise} Promise object represents the result of the issued query
     */
    shortQuery(address: number, command: number, arg: any[], options?: Options): Promise<any>;
    LongCommand(): void;
    /**
     * Issue a long query command to a specific sensor.
     *
     * @param {number} address
     * @param {number} command
     * @param {Array} arg
     * @param {Options} [options = { timeout: MAX_INT, retries: MAX_INT, retryTimeout: MAX_INT }]
     *
     * @returns {Promise} Promise object represents the result of the long query.
     * On resolve the result contains an array with this format
     * [[header data],[data],[data]... [data...]]
     */
    LongQuery(address: number, command: number, arg: any[], options?: Options): Promise<any>;
    /**
     * Get a stream interface from a query
     *
     * @param {number} address
     * @param {number} command
     * @param {Array} arg
     * @param {Options} [options = { timeout: MAX_INT, retries: MAX_INT, retryTimeout: MAX_INT }]
     *
     * @returns {ReadableStream} to the result of the query
     */
    LongQueryStream(address: number, command: number, arg: any[], options?: Options): ReadableStream;
    broadcast(command: any, arg: any): any;
    close(): void;
}
import CommandPacketParser = require("./parser");
export declare const errors: typeof import("./errors");
//# sourceMappingURL=core.d.ts.map