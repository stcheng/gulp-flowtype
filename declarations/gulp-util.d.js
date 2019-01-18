declare module "gulp-util" {
  declare function beep(val:any, cb:any): void;
  declare class PluginError {
    constructor(plugin: string, message: string): void;
  }
}
