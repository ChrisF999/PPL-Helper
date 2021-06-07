"use strict";

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { onExit } = require('@rauschma/stringio');
const chalk = require('chalk');
const registry = require('winreg');
const pressAnyKey = require('press-any-key');
const VDF = require('simple-vdf2');
const downloadRelease = require('@terascope/fetch-github-release');
let pathfortheend = undefined;

var util = require('util');
var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'});
var log_stdout = process.stdout;

console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};

function findSteamWin32() {
    let base = process.env['ProgramFiles(x86)'] || process.env.ProgramFiles;

    return directoryExists(base + '\\Steam').catch(() => {
        return readRegistry();
    });
}

function directoryExists(dir) {
    return new Promise((resolve, reject) => {
        fs.access(dir, fs.constants.R_OK, (err) => {
            err ? reject(err) : resolve(dir);
        });
    });
}
function readRegistry() {
    // We can't find Steam. Let's try with the registry
    let i;
    let prefix = '\\Software\\WOW6432Node';

    let regKey = new registry({
        hive: registry.HKLM,
        key: prefix + '\\Valve\\Steam\\',
    });

    return new Promise((resolve, reject) => {
        regKey.values(function (err, items) {
            if (err) {
                reject(err);
            } else {
                for (i = 0; i < items.length; ++i) {
                    if (items[i].name === 'InstallPath') {
                        resolve(directoryExists(items[i].value));
                    }
                }

                reject();
            }
        });
    });
}

async function findPulsarLostColony() {
    //todo add steam install location check
    let steampath = path.resolve(`${path.resolve(await findSteamWin32())}\\steamapps`);

    let pathPulsarLostColony;
    console.log(chalk.blue('Checking for Steam Libraries\n'));

    if (fs.existsSync(path.resolve(steampath))) {
        console.log(chalk.green(`Steam Library Detected at ${steampath}`));
        steampath = path.resolve(`${path.resolve(await findSteamWin32())}\\steamapps\\libraryfolders.vdf`);
        let steamlibaries = new VDF.parse(fs.readFileSync(path.resolve(steampath), { encoding: 'utf8', flag: 'r' }));

        let steamlibrary = Object.keys(steamlibaries.LibraryFolders);
        steamlibrary.splice(-2);
        let pulsarcheck = [];
        pulsarcheck.push(path.resolve(await findSteamWin32()));
        let pulsarfound = false;
        steamlibrary.forEach((value) => {
            pulsarcheck.push(path.resolve(steamlibaries.LibraryFolders[value]));
            console.log(chalk.green(`Steam Library Detected at ${path.resolve(steamlibaries.LibraryFolders[value])}`));
        });
        pulsarcheck.forEach((steampath) => {
            let temp = fs.readdirSync(path.resolve(steampath.concat('\\steamapps')));

            temp.forEach((file) => {
                if (file.includes('appmanifest_252870.acf') && fs.existsSync(path.resolve(steampath.concat('\\steamapps\\common\\PULSARLostColony')))) {
                    pulsarfound = true;
                    console.log(chalk.blue(`\nPULSAR: Lost Colony detected at ${path.resolve(steampath.concat('\\steamapps\\common\\PULSARLostColony'))}`));
                    pathPulsarLostColony = steampath.concat('\\steamapps\\common\\PULSARLostColony');
                }
            });
        });

        if (!pulsarfound) {
            console.log(chalk.red('\nPULSAR: Lost Colony was not detected as installed'));
            waitforkey();
            return;
        }
    } else {
        console.log(chalk.red('Steam cannot be found.'));
        waitforkey();
        return;
    }
    pathfortheend = pathPulsarLostColony;
    return pathPulsarLostColony;
}

function waitforkey() {
    pressAnyKey().then(() => {
        process.exit(0);
    });
}

function downloadPPL() {
    const user = 'PULSAR-Modders';
    const repo = 'pulsar-plugin-loader';
    const outputdir = './temp';
    const leaveZipped = false;
    const disableLogging = false;
    // Define a function to filter releases.
    function filterRelease(release) {
        // Filter out prereleases.
        return release.prerelease === false;
    }

    // Define a function to filter assets.
    function filterAsset(asset) {
        // Select assets that contain the string 'windows'.
        return asset.name.includes('PulsarPluginBootstrapper');
    }
    downloadRelease(user, repo, outputdir, filterRelease, filterAsset, leaveZipped, disableLogging)
        .then(async function () {
            console.log(chalk.green('Downloaded PPL'));
            runPPL(await findPulsarLostColony());
        })
        .catch(function (err) {
            console.error(err.message);
            process.exit(1);
        });
}
function deletePPLGraceful() {
    fs.rmSync('./temp', { recursive: true }, (err) => {
        if (err) {
            console.error(err);
            process.exit(0);
        }
    });

    console.log(chalk.green('\nPPL Helper has cleaned up'));
    console.log(
        chalk.blue(`PPL Helper has installed PPL for you. You can now install mods in ${chalk.yellow(path.join(pathfortheend, '\\PULSAR_LostColony_Data\\Managed\\Plugins'))}`)
    );
    console.log(chalk.blue("PPL Helper was made by ChrisF999 thanks for using it"));

    waitforkey();
    return;
}
downloadPPL();

async function runPPL(pathPulsarLostColony) {
    if (pathPulsarLostColony) {
        const Assembly = path.join(pathPulsarLostColony, '\\PULSAR_LostColony_Data\\Managed\\Assembly-CSharp.dll');
        const bootstaper = path.resolve('./temp/PulsarPluginBootstrapper.exe');
        if (fs.existsSync(path.resolve(Assembly)) && fs.existsSync(path.resolve(bootstaper))) {
            console.log(chalk.green('\nPPL is running'));

            const childProcess = spawn(bootstaper, [Assembly], { stdio: [process.stdin, process.stdout] });
          
            await onExit(childProcess).then(() => {
              log_file.write(util.format(fs.readFileSync('./temp/Log.txt', {encoding:'utf8', flag:'r'}))); 
                deletePPLGraceful();
            });
        } else {
            console.log(chalk.red('Assembly-CSharp.dll not detected please verify your game files.'));
            waitforkey();
            return;
        }
    }
}
function deletePPL() {
    if (fs.existsSync('./temp')) {
        fs.rmSync('./temp', { recursive: true }, (err) => {
            if (err) {
                console.error(err);
                process.exit(0);
            }
            console.log(chalk.green('\nPPL Helper has cleaned up'));
        });
    }
}

process
  .on("unhandledRejection", (reason, p) => {
    console.log(chalk.red.bold("You should never see this please report it"));
    console.error(reason, "Unhandled Rejection at Promise", p);
    waitforkey();
  })
  .on("uncaughtException", (err) => {
    console.log(chalk.red.bold("You should never see this please report it"));
    console.error(err, "Uncaught Exception thrown");
    waitforkey();
  })
  .on("exit", () => {
    deletePPL();
  });