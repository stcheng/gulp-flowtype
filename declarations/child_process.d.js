declare module 'child_process' {
  declare function execFile(command: string, args: string[], callback: any) : void;
}
