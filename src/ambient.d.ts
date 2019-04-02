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
    add(source: SourceDest): this;
    cmd(command: string | CommandArray | CommandString): this;
    comment(...comments: string[]): this;
    copy(source: SourceDest): this;
    entryPoint(entryPoint: EntryPoint): this;
    env(environment: KeyValueMapping): this;
    expose(port: number | Expose | ReadonlyArray<string | Expose>): this;
    from(image: string | From): this;
    label(label: KeyValueMapping): this;
    maintainer(maintainer: string | Maintainer): this;
    run(command: string | RunCommand | RunCommands): this;
    user(user: string): this;
    workdir(workdir: string): this;

    separator(separator: string): this;
    steps(): unknown[];

    render(): string;
  }
}
