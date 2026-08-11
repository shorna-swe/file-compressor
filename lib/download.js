const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");


class Download {
    constructor(url, directory) {
        this.url = url;
        this.directory = directory;

        this._finished = false;
        this._started = false;
        this._downloaded = 0;
        this._total = 0;
        this._speed = 0;

        this._finishCallbacks = [];
        this._errorCallbacks = [];

        this._lastBytes = 0;
        this._lastTime = Date.now();

        this._start();
        this.destination = null;
    }

    getProgress() {
        return {
            downloaded: this._downloaded,
            destination: this.destination,
            total: this._total,
            percentage: this._total > 0
                ? (this._downloaded / this._total) * 100
                : 0,
            speed: this._speed
        };
    }

    finished() {
        return this._finished;
    }

    onFinish(callback) {
        if (typeof callback !== "function") {
            throw new TypeError("onFinish expects a function");
        }

        this._finishCallbacks.push(callback);

        // If the download already finished, invoke immediately.
        if (this._finished) {
            callback();
        }

        return this;
    }

    onError(callback) {
        if (typeof callback !== "function") {
            throw new TypeError("onError expects a function");
        }

        this._errorCallbacks.push(callback);

        return this;
    }

    _start() {
        this._started = true;

        fs.mkdir(this.directory, { recursive: true }, (mkdirError) => {
            if (mkdirError) {
                this._fail(mkdirError);
                return;
            }

            this._request(this.url);
        });
    }

    _request(url) {
        let parsed;

        try {
            parsed = new URL(url);
        } catch (error) {
            this._fail(error);
            return;
        }

        const protocol = parsed.protocol === "https:"
            ? https
            : http;

        const request = protocol.get(parsed, (response) => {
            // Follow redirects.
            if (
                response.statusCode >= 300 &&
                response.statusCode < 400 &&
                response.headers.location
            ) {
                response.resume();

                const redirectedUrl = new URL(
                    response.headers.location,
                    url
                ).toString();

                this._request(redirectedUrl);
                return;
            }

            if (response.statusCode < 200 || response.statusCode >= 300) {
                response.resume();

                this._fail(
                    new Error(
                        `Download failed with HTTP status ${response.statusCode}`
                    )
                );

                return;
            }

            this._total = Number(response.headers["content-length"]) || 0;

            const filename = this._getFilename(
                url,
                response.headers["content-disposition"]
            );

            const outputPath = path.join(
                this.directory,
                filename
            );

            this.destination = outputPath;
            const file = fs.createWriteStream(outputPath);

            file.on("error", (error) => {
                response.destroy();
                this._fail(error);
            });

            response.on("data", (chunk) => {
                this._downloaded += chunk.length;
                this._updateSpeed();
            });

            response.on("error", (error) => {
                file.destroy();
                this._fail(error);
            });

            file.on("finish", () => {
                file.close(() => {
                    this._finished = true;

                    for (const callback of this._finishCallbacks) {
                        callback();
                    }
                });
            });

            response.pipe(file);
        });

        request.on("error", (error) => {
            this._fail(error);
        });
    }

    _updateSpeed() {
        const now = Date.now();
        const elapsed = now - this._lastTime;

        if (elapsed < 250) {
            return;
        }

        const bytes = this._downloaded - this._lastBytes;

        this._speed = bytes / (elapsed / 1000);

        this._lastBytes = this._downloaded;
        this._lastTime = now;
    }

    _getFilename(url, contentDisposition) {
        if (contentDisposition) {
            const match = contentDisposition.match(
                /filename\*?=(?:UTF-8''|")?([^";]+)/i
            );

            if (match) {
                const filename = decodeURIComponent(
                    match[1].replace(/"/g, "")
                );

                if (filename) {
                    return path.basename(filename);
                }
            }
        }

        try {
            const pathname = new URL(url).pathname;
            const filename = path.basename(pathname);

            if (filename) {
                return decodeURIComponent(filename);
            }
        } catch (_) {
            // Fall through to default filename.
        }

        return "download";
    }

    _fail(error) {
        if (this._finished) {
            return;
        }

        for (const callback of this._errorCallbacks) {
            callback(error);
        }
    }
}

module.exports = Download;
