const Discord = require("discord.js");
const path = require("path");
const sql = require('sqlite');
sql.open('./scores.sqlite');
const bot = new Discord.Client();
const launchLocation = __dirname;
const config = require(path.join(launchLocation, "config.json"));
const help = require(path.join(launchLocation, "help.json"));
const setDataTable = require(path.join(launchLocation, "Data", "FWTSetData.json"));
const aliasListSets = require(path.join(launchLocation, "Data", "FWTSetAliases.json"));
const aliasListHeroes = require(path.join(launchLocation, "Data", "FWTHeroAliases.json"));
const rainbowRotation = require(path.join(launchLocation, "Data", "FWTSetRotation.json"));
const heroDataTable = require(path.join(launchLocation, "Data", "FWTHeroStats.json"));
const itemDataTable = require(path.join(launchLocation, "Data", "FWTItemMaxStats.json"));
const heroSkillTable = require(path.join(launchLocation, "Data", "FWTHeroSkills.json"));
const triviaTable = require(path.join(launchLocation, "Data", "FWTTrivia.json"));
const flagNames = ["confusion", "charm", "stun", "taunt", "disarm", "immobilize", "decrease movement", "dot", "mp burn", "skill cost", "defense ignore", "defense ignoring damage", "weakening", "buff removal", "hp% damage", "defense decrease", "attack decrease", "hp drain", "mastery decrease", "instant death", "decrease crit rate", "push/pull/switch", "passive attack", "seal", "sleep", "melee", "ranged"];

var triviaChannels = new Set([]);
var triviaLastQuestion = 0;

// Declaring constants/loading databases

//--------------------------------------------------------------------------------------------


for (let i = 0, len = setDataTable.length; i < len; i++) {
    for (let j = 0, weeks = rainbowRotation.length; j < weeks; j++) {
        let grade = setDataTable[i]["Tier"].length.toString() + setDataTable[i]["Grade"];
        if (rainbowRotation[j][grade] == setDataTable[i]["Name"]) {
            setDataTable[i]["Last Time in the Rotation"] = rainbowRotation[j]["Week"];
        }
    }
}   // Adds the last time in rotation data to the set data

//--------------------------------------------------------------------------------------------


function coocooPull(isLast) {
    var number = Math.random();
    if (isLast) {
        var junkrate = 0;
        var platrate = 0;
        var arate = 0.7;
        var srate = 0.27;
    } else {
        var junkrate = 0.55;
        var platrate = 0.28;
        var arate = 0.1;
        var srate = 0.045;
    }
    if (number < junkrate) return "junk";
    else if (junkrate <= number && number < junkrate + platrate) return "platinum";
    else if (junkrate + platrate <= number && number < junkrate + platrate + arate) return "A_set";
    else if (junkrate + platrate + arate <= number && number < junkrate + platrate + arate + srate) return "S_set";
    else return "SS_set";
}
function coocooPull10() {
    var pull10 = new Array(10);
    pull10.fill(null);
    return pull10.map((element, index, array) => coocooPull(index === array.length - 1));
}   // End of CooCoo Pulling functions

//--------------------------------------------------------------------------------------------


function createOutput(list) {
    var dataString = "";
    for (var property in list) {
        if ((list.hasOwnProperty(property)) && (!flagNames.includes(property))) {
            dataString = dataString + capitalize(property) + ": " + list[property] + "\n";
        }
    }
    return dataString;
}
function findNameByAlias(alias, isSet) {
    alias = alias.toLowerCase();
    if (isSet) var aliasList = aliasListSets;
    else var aliasList = aliasListHeroes;
    for (var i = 0, setnum = aliasList.length; i < setnum; i++) {
        for (var j = 0, len = aliasList[i]["aliases"].length; j < len; j++) {
            if (aliasList[i]["aliases"][j] == alias) return aliasList[i]["name"];
        }
    }
    return "nosuchalias";
}
function findData(alias, isSet) {
    if (isSet) {
        var name = findNameByAlias(alias, true);
        var dataTable = setDataTable;
    } else {
        var name = findNameByAlias(alias, false);
        var dataTable = heroDataTable;
    }
    if (name == "nosuchalias") return "nosuchdata";
    const data = dataTable.find(dataItem => dataItem.Name === name);

    return createOutput(data);
}
function SetsOfTheWeek(WeekRequested) {
    var rainbowData = rainbowRotation[rainbowRotation.length - 1 - WeekRequested];
    return createOutput(rainbowData);
}
function findProperty(propertyRequested, effectRequested) {
    var dataString = "";
    for (var i = 0, heronum = heroDataTable.length; i < heronum; i++) {
        if (heroDataTable[i][propertyRequested].includes(effectRequested)) dataString = dataString + "\n" + heroDataTable[i]["Name"];
    }
    return dataString;
}
function findItem(item, level) {
    var dataString = "";
    for (var i = 0, itemnum = itemDataTable.length; i < itemnum; i++) {
        if (itemDataTable[i]["Name"] == item) dataString = itemDataTable[i][level];
    }
    return dataString;
}
function findStat(hero, stat) {
    var dataString = "";
    for (var i = 0, heronum = heroDataTable.length; i < heronum; i++) {
        if (heroDataTable[i]["Name"] == hero) dataString = heroDataTable[i][stat];
    }
    return dataString;
}
function findSkill(alias, skill) {
    var dataString = "";
    var name = findNameByAlias(alias, false);
    if (name == "nosuchalias") return "nosuchdata";
    for (var i = 0, heronum = heroSkillTable.length; i < heronum; i++) {
        if (heroSkillTable[i]["Name"] == name) dataString = heroSkillTable[i][skill];
    }
    return dataString;
}
function findSets(grade, tier) {
    var dataString = "";
    for (var i = 0; i < setDataTable.length; i++) {
        if ((setDataTable[i]["Grade"] == grade) && (setDataTable[i]["Tier"] == tier)) {
            dataString = dataString + "\n" + setDataTable[i]["Name"];
        }
    }
    return dataString;
}   // End of database functions

//--------------------------------------------------------------------------------------------

function getPoints(ID) {
    return sql.get(`SELECT * FROM scores WHERE userID ='${ID}'`)
        .then(row => {
            if (!row)
                return 0;
            else
                return row.points;
        });
}
function trivia(message) {
    triviaChannels.add(message.channel.id);
    do {
        var question = getRandomInt(1, triviaTable.length - 1);
    } while (question == triviaLastQuestion);
    triviaLastQuestion = question;
    var askedQuestion = triviaTable[question]["Question"];
    var correctAnswer = triviaTable[question]["Answer"];

    wait(1500)
        .then(() => message.channel.sendMessage(askedQuestion))
        .then(() => {
            message.channel.awaitMessages(response => response.content.toLowerCase() == correctAnswer.toLowerCase(), {
                max: 1,
                time: 15000,
                errors: ['time'],
            })
                .then((correctMessage) => {
                    var correctUserID = correctMessage.first().author.id;
                    sql.get(`SELECT * FROM scores WHERE userID ='${correctUserID}'`).then(row => {
                        if (!row) {
                            sql.run('INSERT INTO scores (userID, points) VALUES (?, ?)', [correctUserID, 10]);
                        } else {
                            sql.run(`UPDATE scores SET points = ${row.points + 10} WHERE userID = ${correctUserID}`);
                        }
                    }).catch(() => {
                        console.error;
                        sql.run('CREATE TABLE IF NOT EXISTS scores (userID TEXT, points INTEGER)').then(() => {
                            sql.run('INSERT INTO scores (userID, points) VALUES (?, ?)', [correctUserID, 10]);
                        });
                    });
                    getPoints(correctUserID).then(points => {
                        message.channel.sendMessage(`Correct answer "${correctAnswer}" by ${correctMessage.first().member.displayName}! +10 points (new score: ${points})`);
                    });
                    triviaChannels.delete(message.channel.id);
                })
                .catch(() => {
                    message.channel.sendMessage(`Time's up! The correct answer was "${correctAnswer}".`);
                    triviaChannels.delete(message.channel.id);
                });
        });
}

// End of trivia functions

//--------------------------------------------------------------------------------------------

function generateTier(tier) {
    var setTier = "";
    for (var i = 0; i < tier; i++) {
        setTier = setTier + "★";
    }
    return setTier;
}
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}
function PullOrNot() {
    var number = Math.random();
    var YesNo;
    if (number <= 0.5) YesNo = path.join(launchLocation, "Images", "Pull.png");
    else YesNo = path.join(launchLocation, "Images", "Don't Pull.png");
    return YesNo;
}
function findEmojiFromGuildByName(guild, emoji_name) {
    const emoji = guild.emojis.find((emoji) => emoji.name === emoji_name);
    return emoji ? emoji.toString() : emoji_name;
}
function capitalize(inputString) {
    var outputString = inputString.substr(0, 1).toUpperCase() + inputString.substr(1, inputString.length - 1).toLowerCase();
    return outputString;
}
function wait(time) {
    return new Promise(function (resolve) {
        setTimeout(function () {
            resolve();
        }, time);
    });
}   // End of other functions

//--------------------------------------------------------------------------------------------

bot.on("message", message => {
    if (!message.content.startsWith(config.prefix)) return; // Ignore messages that don't start with the prefix
    if (message.author.bot) return; // Checks if sender is a bot

    const args = message.content.split(" ");

    if (message.content.startsWith(config.prefix + "ping")) {
        message.channel.sendMessage("pong! [Response time: " + bot.ping + "ms]");
    } // Bot testing


    else if (message.content.startsWith(config.prefix + "help")) {
        message.channel.sendMessage(help.join("\n\n"), { split: true });
    } // Help command


    else if (message.content.startsWith(config.prefix + "hug")) {
        message.channel.sendMessage("*hug*");
    } // Gives a nice warm hug


    else if (message.content.startsWith(config.prefix + "nameset") && (message.author.id == config.ownerID)) {
        message.guild.member(bot.user).setNickname("A Certain Magical Bot");
        message.channel.sendMessage("My name has been set!");
    } // Sets the bot's name



    else if (message.content.startsWith(config.prefix + "id")) {
        message.reply(`${message.author.id}`);
    } // Tells the user their ID


    else if (message.content.startsWith(config.prefix + "choose")) {
        if (args.length >= 2) {
            var msg = message.content.slice(message.content.indexOf(" ") + 1);
            var choices = msg.split("|");
            message.channel.sendMessage(choices[getRandomInt(0, choices.length)]);
        } else {
            message.channel.sendMessage("Invalid request!");
        }
    } // Bot makes a choice



    else if (message.content.startsWith(config.prefix + "tadaima") && (message.content.includes("maid"))) {
        message.channel.sendMessage("おかえりなさいませ！ご主人様♥, \nDo you want dinner or a shower or \*blushes\* me?");
    } else if (message.content.startsWith(config.prefix + "tadaima")) {
        message.channel.sendMessage("Okaeri dear, \nDo you want dinner or a shower or \*blushes\* me?");
    } // Tadaima ("I'm home")



    else if (message.content.startsWith(config.prefix + "tuturu")) {
        message.channel.sendFile(path.join(launchLocation, "Images", "Tuturu.png"));
    } else if (message.content.startsWith(config.prefix + "moe")) {
        message.channel.sendFile(path.join(launchLocation, "Images", "Shushu.png"));
    } else if (message.content.startsWith(config.prefix + "moa")) {
        message.channel.sendFile(path.join(launchLocation, "Images", "Moa.png"));
    } else if (message.content.startsWith(config.prefix + "tyrant")) {
        message.channel.sendFile(path.join(launchLocation, "Images", "Tyrant.png"));
    } // Custom/Anime commands



    else if (message.content.startsWith(config.prefix + "pull")) {
        message.channel.sendFile(PullOrNot());
    } // Bot does a 50/50 pull or no

    else if (message.content.startsWith(config.prefix + "whale")) {
        var pulls = "";
        var totalPull = "";
        if ((args[1] > 100) || ((args[1] > 10) && (message.guild.id == "164867600457662464"))) {
            message.channel.sendMessage("```OVERFLOW_ERROR```");
            return;
        }
        if (args.length > 1) {
            for (var i = 0; i < args[1]; i++) {
                pulls = coocooPull10().map((emoji_name) => findEmojiFromGuildByName(message.guild, emoji_name));
                totalPull = pulls.join(" ") + "\n" + totalPull;
            }
            message.channel.sendMessage(totalPull, { split: true });
        } else {
            pulls = coocooPull10().map((emoji_name) => findEmojiFromGuildByName(message.guild, emoji_name));
            message.channel.sendMessage(pulls.join(" "));
        }
    } // 10x pull

    else if (message.content.startsWith(config.prefix + "sets")) {
        if (args.length >= 3) {
            var setInfo = findSets(args[1].toUpperCase(), generateTier(args[2]));
            message.channel.sendMessage(setInfo);
        } else {
            message.channel.sendMessage("Invalid request!");
        }
    } // Searches for sets at the requested grade and tier

    else if (message.content.startsWith(config.prefix + "set")) {
        if (args.length >= 2) {
            var setInfo = findData(message.content.slice(message.content.indexOf(" ") + 1), true);
            if (setInfo != "nosuchdata") {
                message.channel.sendMessage(setInfo);
            } else {
                message.channel.sendMessage("Unknown Set!");
            }
        } else {
            message.channel.sendMessage("Invalid request!");
        }
    } // Searches for set info

    else if (message.content.startsWith(config.prefix + "stats")) {
        if (args.length >= 2) {
            var heroStats = findData(args[1], false);
            if (heroStats != "nosuchdata") {
                message.channel.sendMessage(heroStats);
            } else {
                message.channel.sendMessage("Unknown Hero!");
            }
        } else {
            message.channel.sendMessage("Invalid request!");
        }
    } // Searches for hero stats

    else if (message.content.startsWith(config.prefix + "stat")) {
        if (args.length >= 3) {
            var heroRequested = findNameByAlias(args[1]);
            var statRequested = args[2].toLowerCase();
            var statData = findStat(heroRequested, statRequested);
            if (statData != "nosuchdata") {
                message.channel.sendMessage(heroRequested + "'s " + capitalize(statRequested) + ": " + statData);
            } else {
                message.channel.sendMessage("Unknown Hero!");
            }
        } else {
            message.channel.sendMessage("Invalid request!");
        }
    } // Searches for the requested stat of the requested hero

    else if (message.content.startsWith(config.prefix + "effect")) {
        if (args.length >= 2) {
            var effect = args[1];
            if (effect == "list") {
                var flags = "";
                for (var i = 0; i < flagNames.length; i++) {
                    flags = flags + "\n" + capitalize(flagNames[i]);
                }
                message.channel.sendMessage(flags);
            } else if (flagNames.includes(effect)) {
                var effectHeroes = findProperty(effect, "TRUE");
                message.channel.sendMessage(effectHeroes);
            } else {
                message.channel.sendMessage("Unknown effect");
            }
        } else {
            message.channel.sendMessage("Invalid request!");
        }
    } // Searches for which heroes can cause the requested effect

    else if (message.content.startsWith(config.prefix + "property")) {
        if (args.length >= 3) {
            var propertyHeroes = findProperty(args[1].toLowerCase(), capitalize(args[2]));
            message.channel.sendMessage(propertyHeroes);
        } else {
            message.channel.sendMessage("Invalid request!");
        }
    } // Searches for which heroes have the requested property

    else if (message.content.startsWith(config.prefix + "item")) {
        if (args.length >= 2) {
            var itemName = args[1].toLowerCase();
            var itemLevel = args[2];
            var itemStats = findItem(itemName, itemLevel);
            message.channel.sendMessage(itemStats);
        } else {
            message.channel.sendMessage("Invalid request!");
        }
    } // Searches for the requested item's max stats

    else if (message.content.startsWith(config.prefix + "skill")) {
        if (args.length >= 3) {
            var skillData = findSkill(findNameByAlias(args[1]), args[2]);
            if (skillData != "nosuchdata") {
                message.channel.sendMessage(skillData);
            } else {
                message.channel.sendMessage("Unknown Hero!");
            }
        } else {
            message.channel.sendMessage("Invalid request!");
        }
    } // Searches for the requested hero skill

    else if (message.content.startsWith(config.prefix + "rainbow")) {
        if (args.length >= 2) {
            var WeekRequested = args[1];
        } else {
            WeekRequested = 0;
        }
        const currentSets = SetsOfTheWeek(WeekRequested);
        message.channel.sendMessage(currentSets);

    } // Searches for current set rotation

    else if ((message.content.startsWith(config.prefix + "trivia")) && (!triviaChannels.has(message.channel.id))) {
        if (message.channel.type == "dm") {
            message.channel.sendMessage("Please use this command in a server!");
            return;
        }
        message.channel.sendMessage(`+++ ${message.member.displayName} started a new round of FWT Trivia. Get ready! +++`);
        trivia(message);
    } // Starts a round of FWT trivia

    else if (message.content.startsWith(config.prefix + "points")) {
        getPoints(message.author.id).then(points => {
            if (points != 0) {
                message.channel.sendMessage(`Score for ${message.member.displayName}: ${points} points`);
            } else {
                message.channel.sendMessage("You have 0 points! Play trivia using !trivia to earn points");
            }
        });
    } // Looks up how many points an user has
});

// End of all commands
//--------------------------------------------------------------------------------------------

var statusCycle = ["https://github.com/TheMasterDodo/ACertainMagicalBot", "Use !help for info", "Spamming !whale", `Serving ${bot.guilds.size} servers`, `Serving ${bot.channels.size} channels`, `Serving ${bot.users.size} users`];
setInterval(function () {
    var random = getRandomInt(0, statusCycle.length - 1);
    bot.user.setGame(statusCycle[random]);
}, 180000); // Cycles the status message

bot.on('error', (e) => console.error(e));
bot.on('warn', (e) => console.warn(e));
// Captures errors

bot.on("ready", () => {
    console.log(`Ready to server in ${bot.channels.size} channels on ${bot.guilds.size} servers, for a total of ${bot.users.size} users.`);
});

bot.login(config.token);