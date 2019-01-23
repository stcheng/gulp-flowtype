declare module 'child_process' {

    declare type child_process$execFileCallback = (error: ?child_process$Error, stdout: Buffer, stderr: Buffer) => void;

    declare type child_process$execFileOpts = {
        cwd?: string;
        env?: Object;
        encoding?: string;
        timeout?: number;
        maxBuffer?: number;
        killSignal?: string;
        uid?: number;
        gid?: number;
    };

    declare function execFile(
        file: string,
        argsOrOptionsOrCallback?:
            Array<string> | child_process$execFileOpts | child_process$execFileCallback,
        optionsOrCallback?: child_process$execFileOpts | child_process$execFileCallback,
        callback?: child_process$execFileCallback
    ): child_process$ChildProcess;

    declare function execFile(command: string, args: string[], callback: any): void;

    declare function spawn(command: string, argsOrOptions?: Array<string> | child_process$spawnOpts,
        options?: child_process$spawnOpts
    ): child_process$ChildProcess;
}
