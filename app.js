const fs = require('fs');
const path = require('path');
const {spawn} = require('child_process');
const VDF = require('simple-vdf2');
const downloadRelease = require('@terascope/fetch-github-release');

function findPulsarLostColony() {
    //todo add steam install location check
    let steampath = 'C:\\Program Files (x86)\\Steam\\steamapps\\libraryfolders.vdf';
    let pathPulsarLostColony
    console.log('Checking for Steam Libraries\n');

    if (fs.existsSync(steampath)) {
        console.log(`Steam Library Detected at ${path.resolve('C:\\Program Files (x86)\\Steam\\steamapps')}`);

        let steamlibaries = new VDF.parse(fs.readFileSync(steampath, { encoding: 'utf8', flag: 'r' }));

        let steamlibrary = Object.keys(steamlibaries.LibraryFolders);
        steamlibrary.splice(-2);
        let pulsarcheck = [];
        pulsarcheck.push(path.resolve('C:\\Program Files (x86)\\Steam'));
        let pulsarfound = false;
        steamlibrary.forEach((value) => {
            pulsarcheck.push(path.resolve(steamlibaries.LibraryFolders[value]));
            console.log(`Steam Librie Detected at ${path.resolve(steamlibaries.LibraryFolders[value])}`);
        });
        pulsarcheck.forEach((steampath) => {
            let temp = fs.readdirSync(steampath.concat('\\steamapps'));

            temp.forEach((file) => {
                if (file.includes('appmanifest_252870.acf') && fs.existsSync(steampath.concat('\\steamapps\\common\\PULSARLostColony'))) {
                    pulsarfound = true;
                    console.log(`\nPULSAR: Lost Colony detected at ${path.resolve(steampath.concat('\\steamapps\\common\\PULSARLostColony'))}`);
                    pathPulsarLostColony = steampath.concat('\\steamapps\\common\\PULSARLostColony')
                }
            });

        });

        if (!pulsarfound) {
            console.log('\nPULSAR: Lost Colony was not detected as installed')
            process.exit(0)
        }

    } else {
        console.log('Steam cannot be found.');
        process.exit(0);
    }
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
        .then(function () {
            console.log('All done!');
           // runPPL(findPulsarLostColony())
        })
        .catch(function (err) {
            console.error(err.message);
        });
}
function deletePPL() {
    fs.rmdirSync("./temp", { recursive: true }, (err) => {
        if (err) {
            console.error(err)
            process.exit(0)
        }
    })

    console.log('PPL Helper has cleaned up')


}
//downloadPPL()
//deletePPL()


async function runPPL(pathPulsarLostColony) {
    const Assembly = path.resolve(pathPulsarLostColony.concat('\\PULSAR_LostColony_Data\\Managed\\Assembly-CSharp.dll'))
    const bootstaper = (path.resolve('./temp/PulsarPluginBootstrapper.exe'))
    if (fs.existsSync(Assembly) && fs.existsSync(bootstaper)) {
        console.log('\nPPL is running')

        const childProcess = spawn(bootstaper, [Assembly],
        {stdio: [process.stdin, process.stdout]});
    }
}

process.on('exit', (code) => {
    //deletePPL()
  });