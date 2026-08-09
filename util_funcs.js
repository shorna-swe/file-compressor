const fs = require("fs");
const path = require("path");
const crypto = require("crypto");


function measureFolderSpace(folderPath) {

    let totalBytes = 0;
    let totalFiles = 0;
    let totalFolders = 0;

    function getSubfolderCount(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.isDirectory()) {
                totalFolders++;
                getSubfolderCount(path.join(dir, entry.name));
            }
        }
    }

    readDirectory(folderPath, (filePath) => {
        totalFiles++;
        totalBytes += fs.statSync(filePath).size;
    });

    getSubfolderCount(folderPath);

    return {
        size: formatFileSize(totalBytes),
        files: totalFiles,
        folders: totalFolders
    };
}




function readDirectory(dir, callback) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            readDirectory(fullPath, callback);
        } else {
            callback(fullPath, entry);
        }
    }
}

function formatFileSize(bytes) {

    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = bytes;
    let unit = 0;

    while (size >= 1024 && unit < units.length - 1) {
        size /= 1024;
        unit++;
    }

    return `${size.toFixed(2)} ${units[unit]}`;
}



function createFileHash(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash("md5");
        const stream = fs.createReadStream(filePath);

        stream.on("data", (chunk) => hash.update(chunk));
        stream.on("end", () => resolve(hash.digest("hex")));
        stream.on("error", reject);
    });
}
