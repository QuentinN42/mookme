import fs from 'fs';
import { execSync } from 'child_process';
import { HookType } from '../types/hook.types';
import { ADDED_BEHAVIORS } from '../config/types';
import logger from './logger';
import { getRootDir } from './root-dir';

import Debug from 'debug';
const debug = Debug('mookme:git');

/**
 * A helper class for performing git operations
 */
export class GitToolkit {
  /**
   * The absolute path to the root directory holding the git folder
   */
  rootDir: string;

  /**
   * constructor for the GitToolkit class
   *
   */
  constructor() {
    debug('Initializing git toolkit');
    const rootDir = getRootDir('.git');
    debug(`Found root at path ${rootDir}`);

    if (!rootDir) {
      logger.failure('Could not find a git project');
      process.exit(0);
    }
    this.rootDir = rootDir;
  }

  getNotStagedFiles(): string[] {
    debug(`getNotStagedFiles called`);
    const notStagedFiles = execSync('echo $(git diff --name-only)')
      .toString()
      .split(' ')
      .map((pth) => pth.replace('\n', ''));
    debug(`Retrieved the following files not staged: ${notStagedFiles}`);
    return notStagedFiles;
  }

  getStagedFiles(): string[] {
    debug(`getStagedFiles called`);
    const stagedFiles = execSync('echo $(git diff --cached --name-only)')
      .toString()
      .split(' ')
      .map((pth) => pth.replace('\n', ''));
    debug(`Retrieved the following files staged: ${stagedFiles}`);
    return stagedFiles;
  }

  getVCSState(): { staged: string[]; notStaged: string[] } {
    debug(`getVCSState called`);
    return {
      staged: this.getStagedFiles(),
      notStaged: this.getNotStagedFiles(),
    };
  }

  getAllTrackedFiles(): string[] {
    debug(`getAllTrackedFiles called`);
    return execSync('git ls-tree -r HEAD --name-only').toString().split('\n');
  }

  detectAndProcessModifiedFiles(initialNotStagedFiles: string[], behavior: ADDED_BEHAVIORS): void {
    const notStagedFiles = execSync('echo $(git diff --name-only)')
      .toString()
      .split(' ')
      .map((file) => file.replace('\n', ''));

    const changedFiles = notStagedFiles.filter((file) => !initialNotStagedFiles.includes(file));
    if (changedFiles.length > 0) {
      console.log();
      switch (behavior) {
        case ADDED_BEHAVIORS.ADD_AND_COMMIT:
          logger.warning('Files were changed during hook execution !');
          logger.info('Following the defined behavior : Add and continue.');
          for (const file of changedFiles) {
            execSync(`git add ${this.rootDir}/${file}`);
          }
          break;
        case ADDED_BEHAVIORS.EXIT:
          logger.warning(' Files were changed during hook execution ! ');
          logger.info('Following the defined behavior : Exit.');
          process.exit(1);
      }
    }
  }

  writeGitHooksFiles(hookTypes: HookType[]): void {
    const gitFolderPath = `${this.rootDir}/.git`;
    if (!fs.existsSync(`${gitFolderPath}/hooks`)) {
      fs.mkdirSync(`${gitFolderPath}/hooks`);
    }

    logger.info('Writing Git hooks files');

    hookTypes.forEach((type) => {
      logger.info(`- ${gitFolderPath}/hooks/${type}`);
      const mookmeCmd = `npx mookme run --type ${type} --args "$1"`;
      if (fs.existsSync(`${gitFolderPath}/hooks/${type}`)) {
        const hook = fs.readFileSync(`${gitFolderPath}/hooks/${type}`).toString();
        if (!hook.includes(mookmeCmd)) {
          fs.appendFileSync(`${gitFolderPath}/hooks/${type}`, `\n${mookmeCmd}`, { flag: 'a+' });
          execSync(`chmod +x ${gitFolderPath}/hooks/${type}`);
        } else {
          logger.log(`Hook ${type} is already declared, skipping...`);
        }
      } else {
        logger.warning(`Hook ${type} does not exist, creating file...`);
        fs.appendFileSync(`${gitFolderPath}/hooks/${type}`, `#!/bin/bash\n${mookmeCmd}`, { flag: 'a+' });
        execSync(`chmod +x ${gitFolderPath}/hooks/${type}`);
      }
    });
  }

  writeGitIgnoreFiles(hookTypes: HookType[]): void {
    logger.info('Writing `.gitignore files`');

    const root = this.rootDir;
    const lines = hookTypes.map((t) => `.hooks/${t}.local.json`);

    if (!fs.existsSync(`${root}/.gitignore`)) {
      logger.warning(`Project root has no \`.gitignore\` file, creating it...`);
      fs.writeFileSync(`${root}/.gitignore`, lines.join('\n'));
    } else {
      const gitignoreContent = fs.readFileSync(`${root}/.gitignore`).toString();
      for (const line of lines) {
        if (gitignoreContent.includes(line)) {
          fs.appendFileSync(`${root}/.gitignore`, `\n.${line}n\n`, { flag: 'a+' });
        }
      }
    }
  }
}
