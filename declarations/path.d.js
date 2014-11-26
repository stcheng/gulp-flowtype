declare module 'path' {
  declare function normalize(p: string): string;
  declare function join(...args: any[]): string;
  declare function resolve(pathSegments: any[]): string;
  declare function relative(from: string, to: string): string;
  declare function dirname(p: string): string;
  declare function basename(p: string, ext?: string): string;
  declare function extname(p: string): string;
  declare var sep: string;
}
