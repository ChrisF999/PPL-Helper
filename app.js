const fs = require('fs');
const path = require('path');
const {spawn} = require('child_process');
const chalk = require('chalk');
const registry = require('winreg');
const VDF = require('simple-vdf2');
const downloadRelease = require('@terascope/fetch-github-release');
let pathfortheend = undefined;

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
    let prefix = '\\Software';
  
    let regKey = new registry({
      hive: registry.HKLM,
      key: prefix + '\\Valve\\Steam\\'
    });
  
    return new Promise((resolve, reject) => {
      regKey.values(function(err, items) {
        if(err) {
          reject(err);
        } else {
          for(i = 0; i < items.length; ++i) {
            if(items[i].name === 'InstallPath') {
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
    let steampath = path.resolve(`${path.resolve(await findSteamWin32())}\\steamapps\\libraryfolders.vdf`)
    let pathPulsarLostColony
    console.log(chalk.blue('Checking for Steam Libraries\n'));

    if (fs.existsSync(steampath)) {
        console.log(chalk.green(`Steam Library Detected at ${steampath}`));

        let steamlibaries = new VDF.parse(fs.readFileSync(steampath, { encoding: 'utf8', flag: 'r' }));

        let steamlibrary = Object.keys(steamlibaries.LibraryFolders);
        steamlibrary.splice(-2);
        let pulsarcheck = [];
        pulsarcheck.push(path.resolve('C:\\Program Files (x86)\\Steam'));
        let pulsarfound = false;
        steamlibrary.forEach((value) => {
            pulsarcheck.push(path.resolve(steamlibaries.LibraryFolders[value]));
            console.log(chalk.green(`Steam Librie Detected at ${path.resolve(steamlibaries.LibraryFolders[value])}`));
        });
        pulsarcheck.forEach((steampath) => {
            let temp = fs.readdirSync(steampath.concat('\\steamapps'));

            temp.forEach((file) => {
                if (file.includes('appmanifest_252870.acf') && fs.existsSync(steampath.concat('\\steamapps\\common\\PULSARLostColony'))) {
                    pulsarfound = true;
                    console.log(chalk.blue(`\nPULSAR: Lost Colony detected at ${path.resolve(steampath.concat('\\steamapps\\common\\PULSARLostColony'))}`));
                    pathPulsarLostColony = steampath.concat('\\steamapps\\common\\PULSARLostColony')
                }
            });

        });

        if (!pulsarfound) {
            console.log(chalk.red('\nPULSAR: Lost Colony was not detected as installed'))
            process.exit(0)
        }

    } else {
        console.log(chalk.red('Steam cannot be found.'));
        process.exit(0);
    }
    pathfortheend = pathPulsarLostColony
    return pathPulsarLostColony
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
        .then( async function () {
            console.log(chalk.green('Downloaded PPL'));
            runPPL(await findPulsarLostColony())
        })
        .catch(function (err) {
            console.error(err.message);
            process.exit(1)
        });
}
function deletePPL() {
    fs.rmdirSync("./temp", { recursive: true }, (err) => {
        if (err) {
            console.error(err)
            process.exit(0)
        }
    })

    console.log(chalk.green('PPL Helper has cleaned up'))


}
downloadPPL()
//deletePPL()


async function runPPL(pathPulsarLostColony) {
    const Assembly = path.join(pathPulsarLostColony,'\\PULSAR_LostColony_Data\\Managed\\Assembly-CSharp.dll')
    //const Assembly = path.resolve(pathPulsarLostColony.concat('\\PULSAR_LostColony_Data\\Managed\\Assembly-CSharp.dll'))
    const bootstaper = (path.resolve('./temp/PulsarPluginBootstrapper.exe'))
    console.log(Assembly)
    if (fs.existsSync(Assembly) && fs.existsSync(bootstaper)) {
        console.log(chalk.green('\nPPL is running'))

        const childProcess = spawn(bootstaper, [Assembly],
        {stdio: [process.stdin, process.stdout]});
    }
}
//runPPL(findPulsarLostColony())
process.on('exit', (code) => {
    deletePPL()
    console.log(chalk.blue(`PPL Helper has installed PPL for you. You can now install mods in ${chalk.yellow(path.join(pathfortheend,'\\PULSAR_LostColony_Data\\Managed\\Plugins'))}`))
  });

  //downloadPPL()