export = CommandPacketParser;
declare class CommandPacketParser {
    constructor(options: any);
    buffer: any;
    state: number;
    _transform(chunk: any, encoding: any, cb: any): void;
    _flush(cb: any): void;
}
//# sourceMappingURL=parser.d.ts.map