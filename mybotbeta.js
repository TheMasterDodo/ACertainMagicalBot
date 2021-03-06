/* eslint-disable no-useless-escape */
"use strict";
// Modules
const Discord = require("discord.js");
const sql = require("sqlite");
const moment = require("moment");
require("moment-duration-format");
const urban = require("relevant-urban");
const mathjs = require("mathjs");
const YouTube = require("simple-youtube-api");
const ytdl = require("ytdl-core");
const FB = require("fb");
const bot = new Discord.Client();

// Utils
const config = require("./src/Data/config.json");
const help = require("./src/Data/help.json");
const Logger = require("./src/Utilities/logger.js");
const moe = require("./src/Data/Moe.json");
const credits = require("./src/Data/credits.json");
const dictionary = require("./src/Utilities/dictionary.json");

// Datatables
const setDataTable = require("./src/Data/FWTData/FWTSetData.json");
const aliasListSets = require("./src/Data/FWTData/FWTSetAliases.json");
const aliasListHeroes = require("./src/Data/FWTData/FWTHeroAliases.json");
const heroDataTable = require("./src/Data/FWTData/FWTHeroStats.json");
const itemDataTable = require("./src/Data/FWTData/FWTItemMaxStats.json");
const triviaTable = require("./src/Data/FWTData/FWTTrivia.json");
const soulGearTable = require("./src/Data/FWTData/FWTSoulGear.json");
const heroSkillTable = require("./src/Data/FWTData/FWTHeroSkills.json");
const guildRaidTable = require("./src/Data/FWTData/FWTGuildRaid.json");

// Effects
const flagNames = ["confusion", "charm", "stun", "taunt", "disarm", "immobilize", "decrease movement", "dot", "mp burn", "skill cost", "defense ignore", "defense ignoring damage", "weakening", "buff removal", "hp% damage", "defense decrease", "attack decrease", "hp drain", "mastery decrease", "instant death", "decrease crit rate", "push/pull/switch", "passive attack", "seal", "sleep", "melee", "ranged", "overload", "terrain change", "dodge decrease", "decrease healing", "lethal wound", "burn"];

sql.open("./src/Data/botdata.sqlite");

// Trivia
let triviaChannels = new Set([]);
let triviaLastQuestion = 0;

// Music
const youtube = new YouTube(config.google_api_key);
const queue = new Map();

// Logger
const logger = new Logger(config.noLogs);

//--------------------------------------------------------------------------------------------

function coocooPull(isLast) {

  let number = Math.random();

  if (isLast) {
    var junkrate = 0;
    var brate = 0;
    var arate = 0.7;
    var srate = 0.2;
  }
  else {
    junkrate = 0.565;
    brate = 0.27;
    arate = 0.10;
    srate = 0.045;
  }
  if (number < junkrate)
    return "junk";
  else if (junkrate <= number && number < junkrate + brate)
    return "B_set";
  else if (junkrate + brate <= number && number < junkrate + brate + arate)
    return "A_set";
  else if (junkrate + brate + arate <= number && number < junkrate + brate + arate + srate)
    return "S_set";
  else
    return "SS_set";

} // Processes a single coocoo pull

function coocooPull10() {

  let pull10 = new Array(10);
  pull10.fill(null);

  return pull10.map((element, index, array) => coocooPull(index === array.length - 1));

} // Pulls 10 times and returns results in an array

// End of CooCoo Pulling functions

//--------------------------------------------------------------------------------------------


function createListOutput(list) {

  let dataString = "";

  for (let property in list) {
    if ((list.hasOwnProperty(property)) && (!flagNames.includes(property))) {
      dataString += capitalize(property) + ": " + list[property] + "\n";
    }
  }

  return dataString;

} // Creates a output in a list

function findNameByAlias(alias, type) {

  alias = alias.toLowerCase();

  if (type === "set") {
    var aliasList = aliasListSets;
  }
  else if (type === "hero") {
    aliasList = aliasListHeroes;
  }
  else {
    return alias;
  }

  const data = aliasList.find(dataItem => dataItem.aliases.includes(alias));

  if (data !== undefined) {
    return data.name;
  }
  else {
    return "nosuchalias";
  }
} // Finds the correct name from the alias

function findListedPropertyData(alias, type) {

  if (type === "set") {
    var name = findNameByAlias(alias, "set");
    var dataTable = setDataTable;
  }
  else if (type === "hero") {
    name = findNameByAlias(alias, "hero");
    dataTable = heroDataTable;
  }
  else if (type === "soulgear") {
    name = findNameByAlias(alias, "hero");
    dataTable = soulGearTable;
  }

  if (name === "nosuchalias") {
    return "nosuchdata";
  }

  const data = dataTable.find(dataItem => dataItem.Name === name);
  return createListOutput(data);
} // Finds a list of data with properties

function findSingleData(alias, data, type) {

  if (type === "stat") {
    var dataTable = heroDataTable;
    var name = alias;
  }

  const results = dataTable.find(dataItem => dataItem.Name === name);

  if (results !== undefined) {
    return results[data];
  }
  else {
    return;
  }

} // Finds a single piece of data

function findSets(slot, rareness) {

  let dataString = "";

  for (let i = 0; i < setDataTable.length; i++) {
    if ((setDataTable[i]["Slot"] === slot) && (setDataTable[i]["Rareness"] === rareness)) {
      dataString += "\n" + setDataTable[i]["Name"];
    }
  }

  return dataString;
} // Finds all sets at the requested grade and tier

function findProperty(propertyRequested, effectRequested) {

  let dataString = "";

  for (let i = 0, heronum = heroDataTable.length; i < heronum; i++) {
    if ((heroDataTable[i][propertyRequested] != undefined) && (heroDataTable[i][propertyRequested].includes(effectRequested))) {
      dataString += "\n" + heroDataTable[i]["Name"];
    }
  }

  return dataString;
} // Finds all heroes who have the requested property

function findSkillData(heroAlias, skill) {

  const heroName = findNameByAlias(heroAlias, "hero");

  if (heroName === "nosuchalias") {
    return "nosuchdata";
  }

  const heroData = heroSkillTable.find(hero => hero.Name === heroName);

  switch (skill) {
    case 4:
    case "4":
      return `${heroData[skill]}\n**Total Gene Cost**: ${heroData[`${skill}GeneCost`]}`;

    case 5:
    case "5":
      return `${heroData[skill]}\n**Charge Turns**: ${heroData[`${skill}ChargeTurns`]}\n**Total Gene Cost**: ${heroData[`${skill}GeneCost`]}`;

    default:
      return `${heroData[skill]}\n**MP Cost**: ${heroData[`${skill}MPcost`]}\n**Total Gene Cost**: ${heroData[`${skill}GeneCost`]}`;
  }

} // Finds the description, MP cost, and Gene cost for a hero's skill

function findSkillImage(heroAlias, skill) {

  const heroName = findNameByAlias(heroAlias, "hero");

  if (heroName === "nosuchalias") {
    return "nosuchdata";
  }

  switch (skill) {
    case 5:
    case "5":
      const heroData = heroSkillTable.find(hero => hero.Name === heroName);

      if (heroData["5"].includes("currently has no awakening skill")) {
        return "./src/Images/Nexon.gif";
      } // If the hero does not have an awakening skill, send Nexon gif

      if (heroData["5"].includes("has an awakening skill")) {
        return "./src/Images/Coming Soon.jpg";
      } // If the hero has an awakening skill but is not updated, send coming soon image

    // Falls through if awakening skill is updated

    default:
      return `./src/Images/FWT Hero Skills/${heroName} ${skill}.jpg`;
  }
} // Finds a hero skill's image

function findItem(item, slot, rareness) {

  switch (Number(rareness)) {
    case 1:
      var transcendence = 1;
      break;
    case 2:
      transcendence = 1.24;
      break;
    case 3:
      transcendence = 1.60;
      break;
    case 4:
      transcendence = 1.60;
      break;
    case 5:
      transcendence = 1.75;
      break;
    case 6:
      transcendence = 2.00;
      break;
  } // Gets the max transcendence multiplier

  switch (item) {
    case "bow":
      var type = "Weapon";
      var stat1 = "Attack";
      var stat2 = "Crit";
      break;
    case "hammer":
    case "mace":
      type = "Weapon";
      stat1 = "Attack";
      stat2 = "Counter Damage";
      break;
    case "sword":
      type = "Weapon";
      stat1 = "Attack";
      stat2 = "Hit";
      break;
    case "armour":
    case "armor":
      type = "Armor";
      stat1 = "HP";
      stat2 = "Defense";
      break;
    case "sheild":
    case "shield":
      type = "Armor";
      stat1 = "HP";
      stat2 = "Counter Rate";
      break;
    case "boot":
    case "boots":
      type = "Armor";
      stat1 = "HP";
      stat2 = "Dodge";
      break;
    case "ring":
      type = "Accessory";
      stat1 = "Hit";
      stat2 = "Crit";
      break;
    case "brooch":
      type = "Accessory";
      stat1 = "HP";
      stat2 = "Defense";
      break;
    case "neck":
    case "necklace":
      type = "Accessory";
      stat1 = "Mastery";
      stat2 = "Attack";
      break;
  } // Gets type of item and stat types

  for (let i = 0; i < itemDataTable.length; i++) {
    if (itemDataTable[i]["Type"] === type) {
      const valueOfStat1 = itemDataTable[i][capitalize(item)][slot][stat1] * transcendence;
      const valueOfStat2 = itemDataTable[i][capitalize(item)][slot][stat2] * transcendence;

      return `${stat1}: ${valueOfStat1.toString()}, ${stat2}: ${valueOfStat2.toString()}`;
    }
  }
} // Finds item max stats

function findStatRank(statRequested, limit) {

  // Checks if requested stat is numerical
  if ((isNaN(heroDataTable[1][statRequested.toLowerCase()])) || (flagNames.includes(statRequested.toLowerCase()))) {
    return ["Invalid stat!"];
  }

  let dataArray = [];

  for (let i = 1; i < heroDataTable.length; i++) {
    dataArray.push(heroDataTable[i]["Name"], heroDataTable[i][statRequested.toLowerCase()]);
  }

  for (let i = 1; i < dataArray.length; i += 2) {
    for (let j = 1; j < dataArray.length - 1; j += 2) {
      if ((parseInt(dataArray[j + 2], 10) > parseInt(dataArray[j], 10)) && (i !== j) || (dataArray[j] === "") || (dataArray[j] === "N/A")) {
        let tempName = dataArray[j - 1];
        let tempStat = dataArray[j];
        dataArray[j - 1] = dataArray[j + 1];
        dataArray[j] = dataArray[j + 2];
        dataArray[j + 1] = tempName;
        dataArray[j + 2] = tempStat;
      }
    }
  }

  if (limit) {
    dataArray.splice(limit * 2);
  }

  return dataArray;
}

function findHeroBirthday(heroAlias) {

  const heroName = findNameByAlias(heroAlias, "hero");

  if (heroName === "nosuchalias") {
    return "nosuchdata";
  }

  return `./src/Images/FWT Hero Birthdays/${heroName.toLowerCase()}.jpg`;
}

async function filterSets(setEffect) {
  setEffect = setEffect.toLowerCase();

  switch (setEffect) {
    case "aura":
      setEffect = "all allies";
      break;
  }

  const filteredSets2pc = setDataTable.filter(set => set["2pc"].toLowerCase().includes(setEffect));
  const filteredSets3pc = setDataTable.filter(set => set["3pc"].toLowerCase().includes(setEffect));

  let filteredSets = new Set([]);

  // Add only unique sets to the Set object
  filteredSets2pc.forEach(set => filteredSets.add(set));
  filteredSets3pc.forEach(set => filteredSets.add(set));

  filteredSets = Array.from(filteredSets).sort(function (a, b) {
    const nameA = a.Name.toUpperCase();
    const nameB = b.Name.toUpperCase();

    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
      return 1;
    }

    // If object names are equal
    return 0;
  });

  let dataString = "";

  filteredSets.forEach(set => dataString += set.Name + ` (Slot ${set.Slot}, ${set.Rareness}) ` + "\n");

  if (dataString !== "") {
    return dataString;
  }

  // If dataString is empty
  return "No sets found!";
}

// End of database functions

//--------------------------------------------------------------------------------------------

function getPoints(ID) {
  return sql.get("SELECT * FROM scores WHERE userID = ?", ID)
    .then(row => {
      if (!row) {
        sql.run("INSERT INTO scores (userID, points) VALUES (?, ?)", [ID, 0])
          .then(() => {
            return 0;
          });
      } else
        return row.points;
    });
} // Finds the user's score

function trivia(message, isCritQuestion, rewardPoints) {

  triviaChannels.add(message.channel.id);

  do {
    var question = getRandomInt(1, triviaTable.length);
  } while (question === triviaLastQuestion);

  triviaLastQuestion = question;
  const askedQuestion = triviaTable[question]["Question"];
  const correctAnswer = triviaTable[question]["Answer"];

  wait(1500)
    .then(() => message.channel.send(askedQuestion))
    .then(() => {
      message.channel.awaitMessages(response => response.content.toLowerCase() === correctAnswer.toLowerCase(), {
        max: 1,
        time: 15000,
        errors: ["time"],
      })
        .then((correctMessage) => {

          const correctUserID = correctMessage.first().author.id;

          sql.get("SELECT * FROM scores WHERE userID = ?", correctUserID)
            .then(row => {
              if (!row) {
                sql.run("INSERT INTO scores (userID, points) VALUES (?, ?)", [correctUserID, rewardPoints]);
              }
              else {
                sql.run(`UPDATE scores SET points = ${row.points + rewardPoints} WHERE userID = ${correctUserID}`);
              }
            })
            .catch(() => {
              sql.run("CREATE TABLE IF NOT EXISTS scores (userID TEXT, points INTEGER)").then(() => {
                sql.run("INSERT INTO scores (userID, points) VALUES (?, ?)", [correctUserID, rewardPoints]);
              });
            });
          getPoints(correctUserID)
            .then(points => {
              message.channel.send(`Correct answer "${correctAnswer}" by ${correctMessage.first().member.displayName}! +${rewardPoints} points (Total score: ${points + rewardPoints}) || Highscores: !highscores`);
            });
          triviaChannels.delete(message.channel.id);
        })
        .catch(() => {
          message.channel.send(`Time's up! The correct answer was "${correctAnswer}".`);
          triviaChannels.delete(message.channel.id);
        });
    });
} // Main trivia function

function removeTriviaEntry(rowID) {
  sql.run("DELETE FROM scores WHERE _rowid_ IN (?)", rowID);
}
// Delete a trivia player's score


function giveTriviaPoints(UserID, points) {
  sql.get("SELECT * FROM scores WHERE userID = ?", UserID)
    .then(row => {
      if (!row) {
        sql.run("INSERT INTO scores (userID, points) VALUES (?, ?)", [UserID, points]);
      }
      else {
        sql.run(`UPDATE scores SET points = ${row.points + points} WHERE userID = ${UserID}`);
      }
    });
}
// Give a trivia player points

function removeTriviaPoints(UserID, points) {
  sql.get("SELECT * FROM scores WHERE userID = ?", UserID)
    .then(row => {
      if (!row) {
        sql.run("INSERT INTO scores (userID, points) VALUES (?, ?)", [UserID, points]);
      }
      else {
        sql.run(`UPDATE scores SET points = ${row.points - points} WHERE userID = ${UserID}`);
      }
    });
}
// Remove points from a trivia player 

// End of trivia functions

//--------------------------------------------------------------------------------------------

function generateRareness(rareness) {

  let setTier = "";

  for (let i = 0; i < rareness; i++) {
    setTier = setTier + "★";
  }

  return setTier;
} // Makes the tiers for set equipment

function news(newsLimit, message) {

  const parseNewsLimit = (rawValue) => {
    const limit = Number.parseInt(rawValue, 10);
    return !Number.isNaN(limit) && limit > 0 && limit <= 100 ? limit : 1;
  };

  const limit = parseNewsLimit(newsLimit);
  const facebookEntityName = "Fwar";

  return new Promise((resolve, reject) => {
    FB.napi(facebookEntityName + "/posts", {
      fields: ["from", "permalink_url", "message", "attachments{type,title,description,media,subattachments}"], limit
    }, (error, response) => {
      if (error) {
        if (error.response.error.code === "ETIMEDOUT") {
          console.log("request timeout");
        }
        else {
          console.log("error", error.message);
        }
        reject(error);
      }
      else {
        resolve(response.data.map(postData => {
          const attachments = postData.attachments ? postData.attachments.data[0] : null;

          if (message.channel.type === "dm") {
            var color = "#4F545C";
          }
          else {
            color = message.guild.me.displayColor;
          }

          const embed = new Discord.RichEmbed()
            .setDescription(getNewsDescription(postData))
            .setTitle(getNewsTitle(postData))
            .setAuthor(postData.from.name, null, "https://www.facebook.com/" + facebookEntityName)
            .setColor(color)
            .setURL(postData.permalink_url);

          if (attachments) {
            if (attachments.type !== "album") {
              embed.setImage(attachments.media.image.src);
            }
            else if (attachments.subattachments) {
              embed._submessages = attachments.subattachments.data.map(photo => ({
                embed: {
                  image: {
                    url: photo.media.image.src
                  }
                }
              }));
            }
          }
          return {
            embed
          };
        }).filter(data => data !== null));
      }
    });
  });
} // Gets the lastest posts from FWT Facebook

function calcGRDamage(mainSkillDmg, coopDmg, noOfNormalCoops, specialCoopDmg, noOfSpecialCoops, hasPropertyAdv, hasTerrainAdv, hasDirectonalAdv) {

  let propertyAdv = 1;
  let terrainAdv = 1;
  let directionAdv = 1;

  if (hasPropertyAdv) {
    propertyAdv = 1.3;
  }

  if (hasTerrainAdv) {
    terrainAdv = 1.2;
  }

  if (hasDirectonalAdv) {
    directionAdv = 1.15;
  }

  return (mainSkillDmg + (coopDmg * noOfNormalCoops) + (specialCoopDmg * noOfSpecialCoops)) * propertyAdv * terrainAdv * directionAdv;
}

// End of other FWT functions

//--------------------------------------------------------------------------------------------

function play(guild, song) {
  const serverQueue = queue.get(guild.id);

  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }
  console.log(serverQueue.songs);

  const dispatcher = serverQueue.connection.playStream(ytdl(song.url, { quality: "highestaudio" }))
    .on("end", reason => {
      if (reason === "Stream is not generating quickly enough.")
        console.log("Song ended.");
      else
        console.log(reason);
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on("error", error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

  serverQueue.textChannel.send(`🎶 Start playing: **${song.title}**`);
}

async function handleVideo(video, message, voiceChannel, playlist = false) {
  const serverQueue = queue.get(message.guild.id);
  console.log(video);
  const song = {
    id: video.id,
    title: video.title,
    url: `https://www.youtube.com/watch?v=${video.id}`
  };
  if (!serverQueue) {
    const queueConstruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
    };
    queue.set(message.guild.id, queueConstruct);

    queueConstruct.songs.push(song);

    try {
      var connection = await voiceChannel.join();
      queueConstruct.connection = connection;
      play(message.guild, queueConstruct.songs[0]);
    }
    catch (error) {
      console.error(`I could not join the voice channel: ${error}`);
      queue.delete(message.guild.id);
      return message.channel.send(`I could not join the voice channel: ${error}`);
    }
  }
  else {
    serverQueue.songs.push(song);
    console.log(serverQueue.songs);
    if (playlist)
      return;
    else
      return message.channel.send(`✅ **${song.title}** has been added to the queue!`);
  }
  return;
}

// End of music functions

//--------------------------------------------------------------------------------------------

function diceRoll(diceType, numberOfRolls) {

  let sum = 0;
  let results = "";
  let roll = 0;

  for (let i = 0; i < numberOfRolls; i++) {
    roll = getRandomInt(1, parseInt(diceType) + 1);
    results = results + roll;
    if (i + 1 != numberOfRolls) {
      results = results + ", ";
    }
    sum += roll;
  }

  return [results, sum];
}

function findEmojiFromGuildByName(guild, emoji_name) {
  const emoji = guild.emojis.find((emoji) => emoji.name === emoji_name);
  return emoji ? emoji.toString() : emoji_name;
} // Finds the emoji id in a guild using the emoji name

function capitalize(inputString) {
  const outputString = inputString.substr(0, 1).toUpperCase() + inputString.substr(1, inputString.length - 1).toLowerCase();

  return outputString;
} // Capitalizes the first letter in a string

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
} // Generates a random integer between the min and max - 1

function wait(time) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve();
    }, time);
  });
} // Waits for a set amount of time

function status() {
  const statusCycle = ["https://github.com/TheMasterDodo/ACertainMagicalBot", "Use !help for info", "!whale", `on ${bot.guilds.size} servers`, `in ${bot.channels.size} channels`, `with ${bot.users.size} users`];

  const random = getRandomInt(0, statusCycle.length);
  bot.user.setActivity(statusCycle[random]);

  logger.log(2, `Set status to ${statusCycle[random]}`);

  setTimeout(status, 600000); // Cycles every 10 minutes
} // Sets the status message of the bot

function incrementUses() {
  // eslint-disable-next-line quotes
  sql.get(`SELECT * FROM utilities WHERE type = "Uses"`)
    .then(row => {
      if (!row) {
        sql.run("INSERT INTO utilities (type, value) VALUES (?, ?)", ["Uses", 0]);
      }
      else {
        sql.run(`UPDATE utilities SET value = ${row.value + 1} WHERE type = "Uses"`);
      }
    })
    .catch(() => {
      sql.run("CREATE TABLE IF NOT EXISTS utilities (type TEXT, value INTEGER)")
        .then(() => {
          sql.run("INSERT INTO utilities (type, values) VALUES (?, ?)", ["Uses", 0]);
        });
    });
} // Increments the number of uses of the bot by 1

function getUses() {
  // eslint-disable-next-line quotes
  return sql.get(`SELECT * FROM utilities WHERE type = "Uses"`)
    .then(row => {
      if (!row)
        return 0;
      else
        return row.value;
    });
} // Gets the number of uses of the bot

function clean(text) {
  if (typeof (text) === "string")
    return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
  else
    return text;
} // Prevents the use of mentions in text

function getNewsDescription(data) {

  const attachments = data.attachments ? data.attachments.data[0] : null;
  let description;

  if (attachments) {
    switch (attachments.type) {
      case "note":
        description = attachments.description;
        break;
      case "cover_photo":
        description = "";
        break;
      case "album":
      case "video_inline":
      default:
        description = data.message.substring(data.message.indexOf("\n"));
    }
  }
  else {
    description = data.message;
  }

  if (description.length > 2048) {
    description = description.substring(0, 2048);
  }
  return description;
} // Gets text content from Facebook post

function getNewsTitle(data) {

  const attachments = data.attachments ? data.attachments.data[0] : null;
  let title = data.message.substring(0, data.message.indexOf("\n"));

  if (attachments) {
    switch (attachments.type) {
      case "note":
        title = data.message;
        break;
      case "album":
        title = data.message.substring(0, data.message.indexOf("\n"));
        break;
      case "video_inline":
        title = `${attachments.title}: ${data.message.substring(0, data.message.indexOf("\n"))}`;
        break;
      case "cover_photo":
        title = attachments.title;
        break;
      default:
        title = data.message.substring(0, data.message.indexOf("\n"));
        break;
    }
  }
  else {
    title = "";
  }
  return title;
} // Gets the title of a Facebook post

function setupFacebookAccessToken() {
  return new Promise((resolve, reject) => {
    FB.napi("oauth/access_token", {
      client_id: config.fbClientID,
      client_secret: config.fbClientSecret,
      grant_type: "client_credentials"
    }, (error, res) => {
      if (error) {
        reject(error);
      }
      else {
        FB.setAccessToken(res.access_token);
        resolve();
      }
    });
  });
} // Gets a Facebook access token

// End of utility functions

//--------------------------------------------------------------------------------------------

async function parseCommand(message) {

  const args = message.content.toLowerCase().slice(config.prefix.length).split(" ");
  const msgContent = message.content.slice(message.content.indexOf(" ") + 1);
  const url = args[1] ? args[1].replace(/<(.+)>/g, "$1") : "";
  const serverQueue = queue.get(message.guild.id);

  logger.log(1, msgContent);

  switch (args[0].toLowerCase()) {

    // Bot Info/Management commands

    case "ping":
      const msg = await message.channel.send("Ping?");
      msg.edit(`Pong! Latency is ${msg.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(bot.ping)}ms`);
      break;

    case "help":
      // Direct message the user who called the command then notify them
      message.author.send(help.join("\n\n"), { split: true })
        .then(() => {
          message.channel.send(`Sent you a list of commands ${message.author}`);
        });
      break;

    case "credits":
      message.channel.send(credits.join("\n\n"));
      break;

    case "info":
      const duration = moment.duration(bot.uptime).format(" D [days], H [hrs], m [mins], s [secs]");

      message.channel.send(`
= STATISTICS =
 • Mem Usage  :: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
 • Uptime     :: ${duration}
 • Users      :: ${bot.users.size.toLocaleString()}
 • Servers    :: ${bot.guilds.size.toLocaleString()}
 • Channels   :: ${bot.channels.size.toLocaleString()}
 • Node       :: ${process.version}`, { code: "asciidoc" });
      break;

    case "nameset":
      // Only owner can set the bot's name
      if (message.author.id === config.ownerID) {

        // If no name was provided, reset bot name to default
        if (args.length === 1) {
          message.guild.member(bot.user).setNickname("A Certain Magical Bot");
        }
        else {
          message.guild.member(bot.user).setNickname(message.content.slice(message.content.indexOf(" ")));
        }

        message.channel.send("My name has been set!");
      }
      else {
        message.channel.send("You have the to be the bot's owner to do this!");
      }
      break;

    case "invite":
      // Send invite link to message's author if no user was mentioned
      if (args.length === 1) {
        message.author.send(config.invite)
          .then(() => {
            message.channel.send(`Sent an invite to ${message.author}`);
          });
      }
      else {
        message.mentions.users.first().send(config.invite)
          .then(() => {
            message.channel.send(`Sent an invite to ${message.mentions.users.first()}`);
          });
      }
      break;

    case "messages":
      getUses()
        .then(msgs => {
          message.channel.send(`I have sent ${msgs} messages since 2017-04-24`);
        });
      break;

    case "github":
      message.channel.send("https://github.com/TheMasterDodo/ACertainMagicalBot");
      break;

    // Utility commands

    case "calc":
      const input = msgContent;
      if (input != "") {
        const result = mathjs.eval(input);
        message.channel.send(result);
      }
      else {
        message.channel.send("Invalid request!");
      }
      break;

    case "id":
      // Send id of message's author if no user was mentioned
      if (args.length === 1) {
        message.reply(`${message.author.id}`);
      }
      else {
        message.channel.send(message.mentions.users.first().id);
      }
      break;

    case "addrole":
      // Must include the name of the role requested

      if (args.length >= 2) {
        const requestedRole = message.guild.roles.find(role => {
          return role.name.toLowerCase() === msgContent.toLowerCase();
        });

        if (requestedRole !== null) {
          message.member.addRole(requestedRole)
            .then(() => {
              message.reply("this role was successfully added to you.");
            })
            .catch(() => {
              message.reply("I do not have permission to access this role");
            });
        }
        else {
          message.reply("this Role does not exist!");
        }
      }
      else {
        message.channel.send("Invalid request!");
      }
      break;

    case "removerole":
      // Must include the name of the role requested
      if (args.length >= 2) {
        const requestedRole = message.guild.roles.find(role => {
          return role.name.toLowerCase() === msgContent.toLowerCase();
        });

        if (requestedRole !== null) {
          message.member.removeRole(requestedRole)
            .then(() => {
              message.reply("this role was successfully removed from you.");
            })
            .catch(() => {
              message.reply("I do not have permission to access this role");
            });
        }
        else {
          message.reply("this Role does not exist!");
        }
      }
      else {
        message.channel.send("Invalid request!");
      }
      break;

    case "eval":
      // Only allow owner to use this command
      if (message.author.id !== config.ownerID) return;
      try {
        const code = msgContent;
        let evaled = eval(code);

        if (typeof evaled !== "string")
          evaled = require("util").inspect(evaled);

        message.channel.send(clean(evaled), { code: "xl" });
      }
      catch (err) {
        message.channel.send(`\`ERROR\` \`\`\`xl\n${clean(err)}\n\`\`\``);
      }
      break;

    case "define":
      // Must include a word/phrase to define
      if (args.length >= 2) {
        const word = msgContent.toLowerCase();
        const startingLetterAlphaCode = word.slice(0, 1).charCodeAt(0) - 97;
        const definition = dictionary[startingLetterAlphaCode][word];

        if (definition !== undefined) {
          message.channel.send(`Definition for ${word}:\n\t${definition}`, { split: { char: " " } });
        }
        else {
          message.channel.send("Could not find a definition for your query. Please check your spelling and remember that !define uses a real dictionary, and not UrbanDictionary (Use !urban for the UrbanDictionary).");
        }
      }
      else {
        message.channel.send("Invalid request!");
      }
      break;

    // Fun commands

    case "hug":
      message.channel.send({ files: ["./src/Images/Hug.gif"] });
      break;

    case "choose":
      if (args.length >= 2) {
        const msg = message.content.slice(message.content.indexOf(" ") + 1);
        const choices = msg.split("|");
        const randomChoice = choices[getRandomInt(0, choices.length)];

        message.channel.send(randomChoice);
      }
      else {
        message.channel.send("Invalid request!");
      }
      break;

    case "urban":
      // Must include a word/phrase to define
      if (args.length >= 2) {
        urban(msgContent)
          .then(response => {
            let msg = [];
            msg.push(`**${response.word}**`);
            msg.push(`\`\`\`${response.definition}\`\`\``);
            msg.push(`**Example:** ${response.example}`);
            msg.push(response.urbanURL);
            message.channel.send(msg.join("\n"), { split: true });
          })
          .catch(() => {
            message.channel.send("An error occured");
            logger.log(3, "[command: urban]");
          });
      }
      else {
        message.channel.send("Invalid request!");
      }
      break;

    case "moe":
      const randomMoeImageLink = moe[getRandomInt(0, moe.length)];
      message.channel.send({ files: [randomMoeImageLink] });
      break;

    case "mee6":
      message.channel.send(`Go check out **${message.guild.name}**'s leaderboard: https://mee6.xyz/levels/${message.guild.id}`);
      break;

    case "tadaima":
      if (message.content.includes("maid")) {
        message.channel.send("おかえりなさいませ！ご主人様♥, \nDo you want dinner or a shower or \*blushes\* me?");
      }
      else {
        message.channel.send("Okaeri dear, \nDo you want dinner or a shower or \*blushes\* me?");
      }
      break;

    case "dice":
    case "roll":
      const dLocation = message.content.indexOf("d");
      const spaceLocation = message.content.indexOf(" ");
      const diceType = message.content.substring(dLocation + 1).trim();
      const numberOfRolls = message.content.substring(spaceLocation + 1, dLocation).trim();
      const rollResults = diceRoll(diceType, numberOfRolls);

      message.channel.send(`Results: ${rollResults[0]}\nSum: ${rollResults[1]}`, { split: true });
      break;

    // Fantasy War Tactics R commands

    case "trivia":
      // Only 1 trivia instance allowed in each channel at one time
      if (!triviaChannels.has(message.channel.id)) {

        if (message.channel.type === "dm") {
          message.channel.send("Please use this command in a server!");
          return;
        }

        let criticalChance = 5;

        if (message.author.id === config.ownerID) {
          criticalChance = 15;
        }

        if (getRandomInt(0, 101) < criticalChance) {

          var rewardPoints = getRandomInt(50, 101); // Random reward points between 50 and 100

          if (message.author.id === config.ownerID) {
            rewardPoints = getRandomInt(70, 101);
          }

          message.channel.send(`+++ ${message.member.displayName} started a new round of FWTR Trivia. Get ready! +++ CRITICAL QUESTION: ${rewardPoints} POINTS +++`);
          trivia(message, true, rewardPoints);
        }
        else {
          rewardPoints = getRandomInt(10, 26); // Random reward points between 10 and 25

          if (message.author.id === config.ownerID) {
            rewardPoints = getRandomInt(15, 26);
          }

          message.channel.send(`+++ ${message.member.displayName} started a new round of FWTR Trivia. Get ready! +++`);
          trivia(message, false, rewardPoints);
        }
      }
      break;

    case "rank":
      // Find score of message's author if no user was mentioned
      if (args.length === 1) {
        var user = message.author;
      }
      else {
        user = message.mentions.users.first();
      }

      sql.all("SELECT COUNT(*) FROM scores")
        .then((data) => {
          getPoints(user.id)
            .then((points) => {
              sql.get(`SELECT COUNT(*) + 1 FROM scores WHERE Points > (SELECT Points FROM scores WHERE userID = ${user.id})`)
                .then(rank => {

                  const totalPlayers = data[0]["COUNT(*)"];
                  rank = rank["COUNT(*) + 1"];

                  if (message.channel.type === "dm") {
                    var color = "#4F545C";
                  } else {
                    color = message.guild.me.displayColor;
                  }
                  const embed = new Discord.RichEmbed()
                    .setAuthor(user.username, user.displayAvatarURL)
                    .addField("Rank", `${rank}/${totalPlayers}`, true)
                    .addField("Points", points, true)
                    .setColor(color);

                  message.channel.send({ embed: embed });
                });
            });
        });
      break;

    case "highscores":
      let response = "__**Fantasy War Tactics R Trivia TOP 10**__";

      sql.all("SELECT userID, points FROM scores ORDER BY points DESC LIMIT 10")
        .then((rows) => {
          for (let i = 0; i < 10; i++) {
            if (bot.users.get(rows[i].userID) === undefined) {
              response += `\n#${i + 1} Unknown User [ID: ${rows[i].userID}] (${rows[i].points})`;
              continue;
            }
            response += `\n#${i + 1} ${bot.users.get(rows[i].userID).username} (${rows[i].points})`;
          }
          message.channel.send(response);
        });
      break;

    case "pull":
      const number = Math.random();

      if (number <= 0.5) {
        message.channel.send({ files: ["./src/Images/Pull.png"] });
      }
      else {
        message.channel.send({ files: ["./src/Images/Don't Pull.png"] });
      }
      break;

    case "whale":
      let pulls = "";
      let totalPull = "";

      if ((args[1] > 10)) {
        message.channel.send("Only 10 pulls allowed at one time!");
        return;
      }

      if (args.length > 1) {
        for (let i = 0; i < args[1]; i++) {
          pulls = coocooPull10().map(emoji_name => {
            findEmojiFromGuildByName(message.guild, emoji_name);
          });
          totalPull = pulls.join(" ") + "\n" + totalPull;
        }
        console.log(totalPull);
        message.channel.send(totalPull, { split: true });
      }
      else {
        pulls = coocooPull10().map(emoji_name => {
          findEmojiFromGuildByName(message.guild, emoji_name);
        });
        message.channel.send(pulls.join(" "));
      }
      break;

    case "effect":
      // TO-DO: Search hero skill table for matching strings
      if (args.length >= 2) {
        const effect = msgContent.toLowerCase();
        if (effect === "list") {
          let flags = "";
          for (let i = 0; i < flagNames.length; i++) {
            flags = flags + "\n" + capitalize(flagNames[i]);
          }
          message.channel.send(flags);
        }
        else if (flagNames.includes(effect)) {
          const effectHeroes = findProperty(effect, "TRUE");
          message.channel.send(effectHeroes);
        }
        else {
          message.channel.send("Unknown effect");
        }
      }
      else {
        message.channel.send("Invalid request!");
      }
      break;

    case "property":
      // TO-DO: allow for multiple properties
      if (args.length >= 3) {
        const propertyHeroes = findProperty(args[1].toLowerCase(), capitalize(args[2]));
        message.channel.send(propertyHeroes);
      }
      else {
        message.channel.send("Invalid request!");
      }
      break;

    case "item":
      // Must have name of item, slot, and rareness
      if (args.length >= 4) {
        const slot = args[2].toUpperCase();
        if (((slot === "I") || (slot === "II") || (slot === "III") || (slot === "IV") || (slot === "V")) && (args[3] >= 1) && (args[3] <= 6)) {
          const itemStats = findItem(args[1].toLowerCase(), slot, args[3]);
          message.channel.send(itemStats);
          return;
        }
      }
      else {
        message.channel.send("Invalid request!");
      }
      break;

    case "stats":
      // Must have name of hero to search
      if (args.length >= 2) {
        const heroStats = findListedPropertyData(args[1], "hero");

        if (heroStats != "nosuchdata") {
          message.channel.send(heroStats);
        }
        else {
          message.channel.send("Unknown Hero!");
        }
      }
      else {
        message.channel.send("Invalid request!");
      }
      break;

    case "stat":
      // Must have name of hero and stat to search
      if (args.length >= 3) {
        const heroRequested = findNameByAlias(args[1], "hero");
        const statRequested = args[2].toLowerCase();
        const statData = findSingleData(heroRequested, statRequested, "stat");

        if ((heroRequested !== "nosuchalias") && (statData !== undefined)) {
          message.channel.send(`${heroRequested}'s ${capitalize(statRequested)}: ${statData}`);
        }
        else {
          message.channel.send("Unknown Hero/Stat!");
        }
      }
      else {
        message.channel.send("Invalid request!");
      }
      break;

    case "statrank":
      // Must have stat to search
      if (args.length >= 2) {
        if (args.length === 2) {
          var statRankings = findStatRank(args[1]);
        }
        else {
          statRankings = findStatRank(args[1], args[2]);
        }
        message.channel.send(statRankings.join("\n"));
      }
      else {
        message.channel.send("Invalid request!");
      }
      break;

    case "compare":
      // Must have stat to compare and at least 2 heroes
      if (args.length >= 4) {
        const statRequested = args[1].toLowerCase();
        let dataString = "";

        for (let i = 0; i < args.length - 2; i++) {
          const heroRequested = findNameByAlias(args[2 + i], "hero");
          const statData = findSingleData(heroRequested, statRequested, "stat");

          if (statData != "nosuchdata") {
            dataString += `\n${heroRequested}'s ${capitalize(statRequested)}: ${statData}`;
          }
          else {
            dataString += "\nUnknown Hero!";
          }
        }

        message.channel.send(dataString);
      }
      else {
        message.channel.send("Invalid request!");
      }
      break;

    case "skills":
      // Must have hero to search
      if (args.length >= 2) {
        for (let i = 1; i <= 5; i++) {
          const heroSkillDescription = findSkillData(args[1], i);
          const heroSkillImage = findSkillImage(args[1], i);

          if ((heroSkillDescription !== "nosuchdata") && (heroSkillImage !== "nosuchdata")) {
            await message.channel.send(heroSkillDescription, { files: [heroSkillImage] });
          }
          else {
            message.channel.send("Invalid request!");
            break;
          }
        }
      }
      else {
        message.channel.send("Invalid request!");
      }
      break;

    case "skill":
      // Must have hero and skill number to search
      if (args.length >= 3) {
        const heroSkillDescription = findSkillData(args[1], args[2]);
        const heroSkillImage = findSkillImage(args[1], args[2]);

        if ((heroSkillDescription !== "nosuchdata") && (heroSkillImage !== "nosuchdata")) {
          await message.channel.send(heroSkillDescription, { files: [heroSkillImage] });
        }
        else {
          message.channel.send("Unknown hero!");
        }
      }
      else {
        message.channel.send("Invalid request!");
      }
      break;

    case "sets":
      // Must have rareness and slot to search for
      if (args.length >= 3) {
        const setsInfo = findSets(args[1].toUpperCase(), generateRareness(args[2]));
        message.channel.send(setsInfo);
      }
      else {
        message.channel.send("Invalid request!");
      }
      break;

    case "set":
      // Must include set alias
      if (args.length >= 2) {
        const setInfo = findListedPropertyData(msgContent, "set");
        if (setInfo != "nosuchdata") {
          message.channel.send(setInfo);
        }
        else {
          message.channel.send("Unknown Set!");
        }
      }
      else {
        message.channel.send("Invalid request!");
      }
      break;

    case "sg":
      // Must include hero alias 
      if (args.length >= 2) {
        const sgData = findListedPropertyData(msgContent, "soulgear");
        if (sgData != "nosuchdata") {
          message.channel.send(sgData);
        }
        else {
          message.channel.send("Unknown Soul Gear!");
        }
      }
      else {
        message.channel.send("Invalid request!");
      }
      break;

    case "birthday":
    case "bday":
    case "bd":
      const heroBirthdayImage = findHeroBirthday(msgContent);

      if (heroBirthdayImage !== "nosuchdata") {
        message.channel.send({ files: [heroBirthdayImage] });
      }
      else {
        message.channel.send("Unknown hero!");
      }
      break;

    case "seteffect":
      // Must include set effect
      if (args.length >= 2) {
        const sets = await filterSets(msgContent);
        message.channel.send(sets, { split: true });
      }
      else {
        message.channel.send("Invalid request!");
      }
      break;

    case "news":
      // If no limit is included, use default limit of 1
      if (args.length < 2) {
        var limit = 1;
      }

      Promise.resolve(news(limit, message)).then((reply) => {
        function sendEmbed({ embed, content = "" }) {
          let additionalMessagesToSend = embed._submessages;
          delete embed._submessages;
          message.channel.send(content, { embed }).catch((error) => {
            console.error(error);
          });
          if (Array.isArray(additionalMessagesToSend)) {
            additionalMessagesToSend.forEach(sendEmbed);
          }
        }

        if (Array.isArray(reply)) {
          reply.forEach(sendEmbed);
        }
        else if (reply.isAttachment) {
          message.channel.send({ files: [reply.attachment] }).catch((error) => {
            console.error(error);
          });
        }
        else if (reply.embed) {
          sendEmbed(reply);
        }
        else if (reply.content) {
          message.channel.sendMessage(reply.content);
        }
      }).catch((error) => {
        console.error(error);
      });
      break;

    case "gr":
    case "guildraid":
    case "guild raid":
      // Must include what to day to search for
      if (args.length === 2) {

        const data = guildRaidTable.find(raidDay => raidDay.Day.toLowerCase() === args[1].toLowerCase());

        if (data != undefined) {
          message.channel.send(createListOutput(data));
        }
        else {
          message.channel.send("Invalid request!");
        }
      }
      else if (args.length === 3) {

        const data = guildRaidTable.find(raidDay => raidDay.Day.toLowerCase() === args[1].toLowerCase());

        if (data != undefined) {
          message.channel.send(data[capitalize(args[2])]);
        }
        else {
          message.channel.send("Invalid request!");
        }
      }
      else if (args.length === 9) {

        let propAdv = false;
        let terrAdv = false;
        let dircAdv = false;

        if (args[6] === "true" || args[6] === "t" || args[6] === "1" || args[6] === "y" || args[6] === "yes") {
          propAdv = true;
        }

        if (args[7] === "true" || args[7] === "t" || args[7] === "1" || args[7] === "y" || args[7] === "yes") {
          terrAdv = true;
        }

        if (args[8] === "true" || args[8] === "t" || args[8] === "1" || args[8] === "y" || args[8] === "yes") {
          dircAdv = true;
        }

        const dmg = calcGRDamage(parseFloat(args[1]), parseFloat(args[2]), parseFloat(args[3]), parseFloat(args[4]), parseFloat(args[5]), propAdv, terrAdv, dircAdv);

        message.channel.send(dmg);

      }
      else {
        message.channel.send("Invalid request!");
      }
      break;

    // Music commands

    case "play":
      const voiceChannel = message.member.voiceChannel;

      if (!voiceChannel)
        return message.channel.send("I\"m sorry but you need to be in a voice channel to play music!");
      const permissions = voiceChannel.permissionsFor(message.client.user);
      if (!permissions.has("CONNECT")) {
        return message.channel.send("I cannot connect to your voice channel, make sure I have the proper permissions!");
      }
      if (!permissions.has("SPEAK")) {
        return message.channel.send("I cannot speak in this voice channel, make sure I have the proper permissions!");
      }

      if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
        const playlist = await youtube.getPlaylist(url);
        const videos = await playlist.getVideos();
        for (const video of Object.values(videos)) {
          const video2 = await youtube.getVideoByID(video.id); 
          await handleVideo(video2, message, voiceChannel, true); 
        }
        return message.channel.send(`✅ Playlist: **${playlist.title}** has been added to the queue!`);
      }
      else {
        try {
          var video = await youtube.getVideo(url);
        }
        catch (error) {
          try {
            var videos = await youtube.searchVideos(msgContent, 10);
            let index = 0;
            message.channel.send(`
__**Song selection:**__

${videos.map(video2 => `**${++index} -** ${video2.title}`).join("\n")}

Please provide a value to select one of the search results ranging from 1-10.
					`);
            try {
              // eslint-disable-next-line no-unused-vars
              var val = await message.channel.awaitMessages(message2 => message2.content > 0 && message2.content < 11, {
                maxMatches: 1,
                time: 20000,
                errors: ["time"]
              });
            }
            catch (err) {
              console.error(err);
              return message.channel.send("No or invalid value entered, cancelling video selection.");
            }
            const videoIndex = parseInt(val.first().content);
            var vid = await youtube.getVideoByID(videos[videoIndex - 1].id);
          }
          catch (err) {
            console.error(err);
            return message.channel.send("🆘 I could not obtain any search results.");
          }
        }
        return handleVideo(vid, message, voiceChannel);
      }

    case "skip":
      if (!message.member.voiceChannel)
        return message.channel.send("You are not in a voice channel!");
      if (!serverQueue)
        return message.channel.send("There is nothing playing that I could skip for you.");
      serverQueue.connection.dispatcher.end("Skip command has been used!");
      break;

    case "stop":
      if (!message.member.voiceChannel)
        return message.channel.send("You are not in a voice channel!");
      if (!serverQueue)
        return message.channel.send("There is nothing playing that I could stop for you.");
      serverQueue.songs = [];
      serverQueue.connection.dispatcher.end("Stop command has been used!");
      break;

    case "volume":
      if (!message.member.voiceChannel)
        return message.channel.send("You are not in a voice channel!");
      if (!serverQueue)
        return message.channel.send("There is nothing playing.");
      if (!args[1])
        return message.channel.send(`The current volume is: **${serverQueue.volume}**`);
      serverQueue.volume = args[1];
      serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);
      return message.channel.send(`I set the volume to: **${args[1]}**`);

    case "np":
      if (!serverQueue)
        return message.channel.send("There is nothing playing.");
      return message.channel.send(`🎶 Now playing: **${serverQueue.songs[0].title}**`);

    case "queue":
      if (!serverQueue)
        return message.channel.send("There is nothing playing.");
      return message.channel.send(`
__**Song queue:**__

${serverQueue.songs.map(song => `**-** ${song.title}`).join("\n")}

**Now playing:** ${serverQueue.songs[0].title}
    `);

    case "pause":
      if (serverQueue && serverQueue.playing) {
        serverQueue.playing = false;
        serverQueue.connection.dispatcher.pause();
        return message.channel.send("⏸ Paused the music for you!");
      }
      return message.channel.send("There is nothing playing.");

    case "resume":
      if (serverQueue && !serverQueue.playing) {
        serverQueue.playing = true;
        serverQueue.connection.dispatcher.resume();
        return message.channel.send("▶ Resumed the music for you!");
      }
      return message.channel.send("There is nothing playing.");

    // Images commands

    case "tuturu":
      message.channel.send({ files: ["./src/Images/Tuturu.png"] });
      break;

    case "moa":
      message.channel.send({ files: ["./src/Images/Moa.png"] });
      break;

    case "hehe":
    case "honghehe":
      message.channel.send({ files: ["./src/Images/HongHehe.gif"] });
      break;

    // Custom commands

    case "thomas":
      if (message.guild.id !== "206553301930475530")
        return;

      message.channel.send("https://media.discordapp.net/attachments/271668608487129088/432953986996371456/image.png");
      break;

    case "aidan":
      if (message.guild.id !== "206553301930475530")
        return;

      message.channel.send("https://cdn.discordapp.com/attachments/206553301930475530/433080037680349184/20180219_214257.png");
      break;
  }
}

async function parseMessage(message) {

  if (message.content.includes("plsgimme") || message.content.includes("gimme!")) {
    message.channel.send({ files: ["./src/Images/Gimme.gif"] });
  } // Sends Shu-shu gimme gif when message contains "gimme"

  if (message.content.includes("angryhedgehog")) {
    message.channel.send({ files: ["./src/Images/AngryHedgeHog.png"] });
  } // Sends angryhedgehog image when message contains "angryhedgehog"

  if (message.content.includes("happyhedgehog")) {
    message.channel.send({ files: ["./src/Images/HappyHedgeHog.jpg"] });
  } // Sends happyhedgehog image when message contains "happyhedgehog"

  if (message.content.includes("lazyhedgehog")) {
    message.channel.send("https://cdn.discordapp.com/attachments/188363158107324418/435184959964315654/unknown_4.png");
  } // Sends lazyhedgehog image when message contains "lazyhedgehog"

  if (message.content.includes("judginghedgehog")) {
    message.channel.send("https://cdn.discordapp.com/attachments/188363158107324418/435184813989822474/71b08112e702c970094520d2c63dc169.jpg");
  } // Sends judginghedgehog image when message contains "judginghedgehog"
}

// End of message parsing functions

//--------------------------------------------------------------------------------------------

bot.on("message", async (message) => {

  if (message.mentions.users.has(bot.user.id)) {
    console.log(`Message Received!\n\tSender: ${message.author.username} \n\tContent: ${message.content.slice(message.content.indexOf(" "))}`);
  } // Logs messages that mention the bot

  if ((config.selfBot) && (message.author.id !== config.ownerID)) {
    return;
  } // If selfbot option is on and the message was not used by the owner, do not respond

  if (message.author.id === bot.user.id) {
    incrementUses();
  } // Increments whenever the bot sends a message (bot is "used")

  parseMessage(message);

  if (!message.content.startsWith(config.prefix)) return;
  // Ignore messages that don't start with the prefix

  if (message.author.bot) return;
  // Checks if sender is a bot

  logger.logFrom(message.channel, 1, `[command: ${message.content.slice(1).split(" ")[0]}]`);
  // Log the content of the command

  parseCommand(message);

});

// Event handler when receiving a message

//--------------------------------------------------------------------------------------------

bot.on("error", (e) => console.error(e));
bot.on("warn", (e) => console.warn(e));
process.on("unhandledRejection", err => {
  logger.log(3, "An error occured!");
  console.error(err);
});
// Captures errors

bot.on("ready", () => {
  logger.log(1, `Ready to server in ${bot.channels.size} channels on ${bot.guilds.size} servers, for a total of ${bot.users.size} users.`);
});


Promise.all([
  setupFacebookAccessToken()
])
  .then(() => {
    bot.login(config.token)
      .then(() => {
        status();
      });
  });