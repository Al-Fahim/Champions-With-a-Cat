//Al Fahim CSCI 355 Final Project
//Chosen API: Riot Games and meowfacts
//Please be aware that the RIOT API Key refreshes every 24 hour if you are going to run this code you can go to https://developer.riotgames.com/ and login to get a key

const fs = require("fs");
const http = require("http");
const https = require("https");

const port = 3000;
const server = http.createServer();

const credentials = require("./credentials.json");

//Start the server
server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

//Handle incoming requests
server.on("request", request_handler);

function request_handler(req, res) {
  console.log(`New Request from ${req.socket.remoteAddress} for ${req.url}`);
  if (req.url === "/") {
    //Serve index.html file
    const form = fs.createReadStream("index.html");
    res.writeHead(200, { "Content-Type": "text/html" });
    form.pipe(res);
  } else if (req.url.startsWith("/search")) {
    //Handle search request
    const user_input = new URL(req.url, `https://${req.headers.host}`).searchParams;
    let displayChampionRotation = user_input.get("rotation");

    res.writeHead(200, { "Content-Type": "text/html" });
    if (displayChampionRotation === "no") {
      res.write("<h1>Too bad</h1>");
    }
    //Retrieve champion rotation
    get_champion_rotation(displayChampionRotation === "yes", res);
  } else {
    //Handle 404 - Not Found
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end(`<h1>404 Not Found</h1>`);
  }
}

function get_champion_rotation(displayRotation, res) {
  console.log("Riot API 1");
  const rotation_endpoint = `https://na1.api.riotgames.com/lol/platform/v3/champion-rotations`;
  const rotation_request = https.request(rotation_endpoint, { method: "GET", headers: credentials });

  //Handle the response from the rotation API
  rotation_request.once("response", stream => {
    process_stream(stream, parse_rotation, displayRotation, res);
  });

  rotation_request.end();
}

function process_stream(stream, callback, ...args) {
  let body = "";
  stream.on("data", chunk => (body += chunk));
  stream.on("end", () => callback(body, ...args));
}

function parse_rotation(rotation_data, displayRotation, res) {
  const rotation_object = JSON.parse(rotation_data);
  let rotation = rotation_object?.freeChampionIds;

  //Get the champion data to get the names of the champions
  get_champion_data(champion_data => {
    const champion_names = map_champion_ids_to_names(rotation, champion_data);
    let results = "";

    if (displayRotation) {
      results = `<h1>Champion Rotation:</h1><ul>${generate_rotation_list(champion_names)}</ul>`;
    } else {
      results = `<h1>Champion Rotation:</h1><ul>${generate_rotation_list(champion_names)}</ul>`;
    }

    results = `<div style="width:49%; float:left;">${results}</div>`;
    //Write the rotation results to the response
    res.write(results.padEnd(1024, " "));
    //Get Meow Fact
    //setTimeout(() => { //This is only inteded as testing it is not part of final 
      get_meowfact(res);
    //}, 5000);
  });
}

function get_champion_data(callback) {
  console.log("dDragon API 2");
  const versions_endpoint = 'https://ddragon.leagueoflegends.com/api/versions.json';
  //Get the versions information from the Data Dragon API
  https.get(versions_endpoint, res => {
    let body = '';
    res.on('data', chunk => (body += chunk));
    res.on('end', () => {
      const versions = JSON.parse(body);
      const latestVersion = versions[0];

      const champion_data_endpoint = `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`;
      //Get the champion data for the latest version
      https.get(champion_data_endpoint, res => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => {
          const champion_data = JSON.parse(body)?.data;
          callback(champion_data);
        });
      });
    });
  });
}

function map_champion_ids_to_names(rotation, champion_data) {
  //Map the champion IDs to their names using the champion data
  return rotation.map(championId => {
    const championKey = Object.keys(champion_data).find(key => champion_data[key].key === String(championId));
    return championKey ? champion_data[championKey].name : `Champion ID: ${championId}`;
  });
}

function generate_rotation_list(rotation) {
  //Generate the HTML list for the champion rotation
  return rotation.map(championName => `<li>${championName}</li>`).join("");
}

function get_meowfact(res) {
  console.log("Meowfacts API 3");
  const meowfacts_endpoint = `https://meowfacts.herokuapp.com/`;
  https.get(meowfacts_endpoint, stream => {
    process_stream(stream, parse_meowfact, res);
  });
}

function parse_meowfact(meowfacts_data, res) {
  const meowfacts = JSON.parse(meowfacts_data);
  const meowfact = meowfacts.data;
  res.write(`<h1>Meow Fact:</h1><p>${meowfact}</p>`, () => terminate(res));
}

function terminate(res) {
  res.end();
}