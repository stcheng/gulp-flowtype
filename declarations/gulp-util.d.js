declare module "gulp-util" {
  declare class PluginError {
    constructor(plugin: string, message: string): void;
  }
}
