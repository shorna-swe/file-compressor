async function keepUpdatingClock() {
    setInterval(function () {
        document.getElementById("clock").innerText =
            new Date().toLocaleTimeString("en-GB");
    }, 1000);
}

async function main() {
    keepUpdatingClock();

    document.getElementById("choose-folder").addEventListener("click", async () => {
        const folder = await window.invoke("select-folder");

        if (folder) {
            document.getElementById("output").innerText =
                "Selected: " + folder;
        }
    });

    document.getElementById("compress").addEventListener("click", async () => {
        await window.invoke("start-compression");
    });

    window.on("compression-progress", (progress) => {
    loadCompressionProgress(progress);
});
}

async function loadCompressionProgress(progress) {
    document.getElementById("progress").value =
        progress.percentage;

    document.getElementById("progress-text").textContent =
        `${progress.percentage.toFixed(2)}% ` +
        `(${progress.files} / ${progress.totalFiles} files)`;

    document.getElementById("output").innerText =
        progress.destination;
}

main();