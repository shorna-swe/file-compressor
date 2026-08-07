const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const utils = require("./utils")



// Finds duplicates in any given directory
// call it like findDuplicates("/path/to/folder")
// Returns list of duplicates like this:
// [{original: "path/to/file", duplicate: "path/to/file"}, ....]


async function findDuplicates(folderPath) {
    const seen = new Map();
    const duplicates = [];

    const files = [];

    utils.walk(folderPath, (filePath) => {
        files.push(filePath);
    });

    for (const filePath of files) {
        try {
        const hash = await utils.hashFile(filePath);

        if (seen.has(hash)) {
            duplicates.push({
                original: seen.get(hash),
                duplicate: filePath,
            });
        } else {
            seen.set(hash, filePath);
        }} catch{
            continue
        }
    }

    return duplicates;
}



// Finds large files in any given directory. 
// call it like findLargeFiles("/path/to/folder")

// You may add an optional extra parameter LIMIT to ignore files smaller than that

// Returns large files list like this:
// [{name: "path/to/file", size: "1234456", size_formatted: "1.2 MB"} ...]

async function findLargeFiles(folderPath, LIMIT = 100 * 1024 * 1024) {
    const result = [];
    const files = [];

    utils.walk(folderPath, (filePath, entry) => {
        files.push({ filePath, entry });
    });

    for (const { filePath, entry } of files) {
        const { size } = await fs.promises.stat(filePath);

        if (size >= LIMIT) {
            result.push({
                name: entry.name,
                size,
                size_formatted: utils.formatSize(size),
            });
        }
    }

    result.sort((a, b) => b.size - a.size);

    return result;
}


module.exports = {
    findDuplicates, findLargeFiles
}
