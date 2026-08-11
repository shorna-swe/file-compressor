const Download = require("./lib/download");
const Compression = require("./lib/compression");


function createAndStartDownload(url, directory) {
    return new Download(url, directory);
}


function createAndStartCompression(source) {
    return new Compression(source, `${source}.zip`);
}
