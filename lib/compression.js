const fs = require("fs");
const path = require("path");
const { ZipArchive } = require("archiver");

class Compression {
    constructor(source, destination) {
        this.source = source;
        this.destination =
            destination ?? `${source}.zip`;

        this._finished = false;
        this._failed = false;

        this._files = 0;
        this._totalFiles = 0;

        this._processedBytes = 0;
        this._totalBytes = 0;

        this._finishCallbacks = [];
        this._progressCallbacks = [];
        this._errorCallbacks = [];

        this._error = null;

        this._start();
    }

    getProgress() {
        return {
            files: this._files,
            totalFiles: this._totalFiles,

            processedBytes: this._processedBytes,
            totalBytes: this._totalBytes,

            destination: this.destination,

            percentage:
                this._totalBytes > 0
                    ? (this._processedBytes /
                       this._totalBytes) * 100
                    : this._finished
                        ? 100
                        : 0
        };
    }

    finished() {
        return this._finished;
    }

    onFinish(callback) {
        if (typeof callback !== "function") {
            throw new TypeError(
                "onFinish expects a function"
            );
        }

        this._finishCallbacks.push(callback);

        if (this._finished) {
            callback(this.destination);
        }

        return this;
    }

    onProgress(callback) {
        if (typeof callback !== "function") {
            throw new TypeError(
                "onProgress expects a function"
            );
        }

        this._progressCallbacks.push(callback);

        return this;
    }

    onError(callback) {
        if (typeof callback !== "function") {
            throw new TypeError(
                "onError expects a function"
            );
        }

        this._errorCallbacks.push(callback);

        if (this._error) {
            callback(this._error);
        }

        return this;
    }

    _start() {
        fs.stat(this.source, (error, stats) => {
            if (error) {
                this._fail(error);
                return;
            }

            if (!stats.isDirectory()) {
                this._fail(
                    new Error(
                        "Source must be a directory"
                    )
                );

                return;
            }

            this._collectFiles(
                this.source,
                [],
                (files) => {
                    if (this._failed) {
                        return;
                    }

                    this._filesToCompress = files;

                    this._compress();
                }
            );
        });
    }

    _collectFiles(directory, files, callback) {
        fs.readdir(
            directory,
            { withFileTypes: true },
            (error, entries) => {
                if (error) {
                    this._fail(error);
                    return;
                }

                if (entries.length === 0) {
                    callback(files);
                    return;
                }

                let pending = entries.length;

                const done = () => {
                    pending--;

                    if (pending === 0) {
                        callback(files);
                    }
                };

                for (const entry of entries) {
                    const entryPath = path.join(
                        directory,
                        entry.name
                    );

                    if (entry.isDirectory()) {
                        this._collectFiles(
                            entryPath,
                            files,
                            done
                        );
                    } else if (entry.isFile()) {
                        fs.stat(
                            entryPath,
                            (error, stats) => {
                                if (error) {
                                    this._fail(error);
                                    return;
                                }

                                this._totalFiles++;
                                this._totalBytes += stats.size;

                                files.push({
                                    path: entryPath,
                                    size: stats.size
                                });

                                done();
                            }
                        );
                    } else {
                        done();
                    }
                }
            }
        );
    }

    _compress() {
        const destinationDirectory =
            path.dirname(this.destination);

        fs.mkdir(
            destinationDirectory,
            { recursive: true },
            (error) => {
                if (error) {
                    this._fail(error);
                    return;
                }

                const output =
                    fs.createWriteStream(
                        this.destination
                    );

                const archive = new ZipArchive({
                    zlib: {
                        level: 9
                    }
                });

                output.on("error", (error) => {
                    this._fail(error);
                });

                archive.on("error", (error) => {
                    this._fail(error);
                });

                output.on("close", () => {
                    if (this._failed) {
                        return;
                    }

                    this._processedBytes =
                        this._totalBytes;

                    this._files =
                        this._totalFiles;

                    this._emitProgress();

                    this._finished = true;

                    for (
                        const callback
                        of this._finishCallbacks
                    ) {
                        callback(this.destination);
                    }
                });

                archive.pipe(output);

                if (this._filesToCompress.length === 0) {
                    archive.finalize().catch(
                        (error) => {
                            this._fail(error);
                        }
                    );

                    return;
                }

                for (const file of this._filesToCompress) {
                    this._appendFile(
                        archive,
                        file
                    );
                }

                archive.finalize().catch(
                    (error) => {
                        this._fail(error);
                    }
                );
            }
        );
    }

    _appendFile(archive, file) {
        const relativePath =
            path.relative(
                this.source,
                file.path
            );

        const archivePath =
            path.join(
                path.basename(this.source),
                relativePath
            );

        const input =
            fs.createReadStream(file.path);

        input.on("data", (chunk) => {
            this._processedBytes +=
                chunk.length;

            this._emitProgress();
        });

        input.on("error", (error) => {
            this._fail(error);
        });

        archive.append(
            input,
            {
                name: archivePath
            }
        );
    }

    _emitProgress() {
        const progress =
            this.getProgress();

        for (
            const callback
            of this._progressCallbacks
        ) {
            callback(progress);
        }
    }

    _fail(error) {
        if (this._failed || this._finished) {
            return;
        }

        this._failed = true;
        this._error = error;

        for (
            const callback
            of this._errorCallbacks
        ) {
            callback(error);
        }
    }
}

module.exports = Compression;
