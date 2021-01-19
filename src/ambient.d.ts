declare module 'valid-filename' {
  function validFilename(str: string): boolean;
  export = validFilename;
}

declare module 'validate-npm-package-name' {
  function validateNpmPackageName(
    name: string,
  ): validateNpmPackageName.ValidationResult;

  namespace validateNpmPackageName {
    interface ValidationResult {
      validForNewPackages: boolean;
      validForOldPackages: boolean;
      errors?: string[];
      warnings?: string[];
    }
  }

  export = validateNpmPackageName;
}

declare module 'dockerfilejs' {
  export interface KeyValueMapping {
    [key: string]: string | KeyValueMapping;
  }

  export interface SourceDest {
    src: string | ReadonlyArray<string>;
    dest: string;
  }

  export interface Chown {
    user?: string | number;
    group?: string | number;
  }

  export interface ChownOptions extends SourceDest {
    chown?: Chown | string | number;
    user?: string | number;
    group?: string | number;
  }

  export interface CopyOptions extends ChownOptions {
    from?: string;
  }

  export interface AddOptions extends ChownOptions {}

  export interface CommandString {
    command: string;
    params?: ReadonlyArray<string>;
  }

  export interface CommandArray {
    executable: string;
    params?: ReadonlyArray<string>;
  }

  export interface EntryPoint {
    executable: string;
    params?: ReadonlyArray<string>;
  }

  export interface Expose {
    number: string;
    protocol: 'tcp' | 'udp';
  }

  export interface From {
    image: string;
    tag?: string;
    digest?: string;
    registry?: string;
    stage?: string;
  }

  export interface Maintainer {
    name: string;
  }

  export type RunCommandType =
    | string
    | ReadonlyArray<string | ReadonlyArray<string>>;

  export interface RunCommand {
    command: RunCommandType;
  }

  export interface RunCommands {
    commands: RunCommandType;
  }

  export class Dockerfile {
    add(source: AddOptions): this;
    cmd(command: string | CommandArray | CommandString): this;
    comment(...comments: string[]): this;
    copy(source: CopyOptions): this;
    entryPoint(entryPoint: EntryPoint): this;
    env(environment: KeyValueMapping): this;
    expose(port: number | Expose | ReadonlyArray<string | Expose>): this;
    from(image: string | From): this;
    label(label: KeyValueMapping): this;
    maintainer(maintainer: string | Maintainer): this;
    run(command: string | RunCommand | RunCommands): this;
    user(user: string): this;
    workdir(workdir: string): this;

    stage(): this;

    separator(separator: string): this;
    steps(): unknown[];

    render(): string;
  }
}

declare module 'json-format' {
  interface IndentConfig {
    type?: 'tab' | 'space';
    size?: number;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export default function jsonFormat(obj: any, config?: IndentConfig): string;
}
