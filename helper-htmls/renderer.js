async function keepUpdatingClock(){
    setInterval(function (){
        document.getElementById("clock").innerText = new Date().toLocaleTimeString("en-GB")
    }, 1000);
}

async function main(){
    keepUpdatingClock();
}

main()
