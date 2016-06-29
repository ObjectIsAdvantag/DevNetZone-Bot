/*
 * Cisco Spark Bot to list Activities
 *
 * Leverages the REST Webhook sample + a Spark Token to write back to the room
 *
 * INSTALLATION NOTES : the node-sparky is required, to install it run :
 *   > npm install node-sparky --save
 *   > 
 */
var SparkBot = require("sparkbot-starterkit");
var Sparky = require("node-sparky");
var request = require("request");

var config = {
    // Required for the bot to send messages
    token: process.env.SPARK_TOKEN,

    attach_as: "integration",
    port: process.env.PORT || 8080,
    URI: process.env.SPARK_URI || "/spark",

    // This id is used to filter all messages orginating from your bot
    // Note: you MUST replace this id by the account associated to the SPARK_TOKEN, otherwise you would encounter a never ending loop, as your bot will listen / write / listen / write...
    peopleId: process.env.SPARK_BOTPERSONID || "Y2lzY29zcGFyazovL3VzL1BFT1BMRS8wNzMyNWQyZi01MWRlLTQxYWItYjNhNC02YTMwZDBiZTVmZWQ",

    // This id is used to filter all messages orginating from your bot
    // Note: you MUST replace this id by the account associated to the SPARK_TOKEN, otherwise you would encounter a never ending loop, as your bot will listen / write / listen / write...
    commandNextSessions: process.env.SPARK_NEXTCOMMAND || "/next",

    maxSessions: process.env.SPARK_MAXDISPLAYED || 10

};

// Starts your bot
var bot = new SparkBot(config);

// Create a Spark client to send messages back to the Room
var sparky = new Sparky({ token: config.token });

// This function will be called every time a new message is posted into Spark
bot.register(function (message) {
    console.log("new message from " + message.personEmail + ": " + message.text);

    // If the message comes from the bot, ignore it
    if (message.personId === config.peopleId) {
        console.log("bot is writing => ignoring");
        return;
    }

    // If it is not a command, ignore it
    var isCommand = message.text.toLowerCase().startsWith("/");
    if (!isCommand) {
        console.log("not a command => ignoring");
        return;
    }

    // Now let's do the actual work or display help
    var isNextSessions = message.text.toLowerCase().startsWith(config.commandNextSessions);
    if (isNextSessions) {
        fetchNextSessions(config.maxSessions, function (err, msg) {
            if (!err) sendText(message.roomId, msg);
        });
        return;
    }

    displayAide(message.roomId);
});

function displayAide(roomId) {
    sendText(roomId, "" + config.commandNextSessions + " to display upcoming activities happening in the DevNet Zone");
}

function showSessions(roomId) {
    var msg = fetchNextSessions(config.maxSessions);
    sendText(roomId, msg);
}

function fetchNextSessions(max, sparkCallback) {

    // Get list of upcoming sessions
    var options = {
        method: 'GET',
        url: 'https://devnetzone.cleverapps.io/api/v1/activities/next'
    };

    request(options, function (error, response, body) {
        if (error) {
            console.log("could not retreive list of activities, error: " + error);
            sparkCallback(new Error("Could not retreive upcoming activities, sorry [Activities API not responding]"), null);
            return;
        }

        if ((response < 200) || (response > 299)) {
            console.log("could not retreive list of activities, response: " + response);
            sparkCallback(new Error("Could not retreive upcoming sessions, sorry [Activities API not responding]"), null);
            return;
        }

        var sessions = JSON.parse(body);
        console.log("retreived " + sessions.length + " activities: " + JSON.stringify(sessions));

        if (sessions.length == 0) {
            // [TODO] Check date is after latest activity

            sparkCallback(null, "ZERO upcoming activity, event should be over by now. Hope you had a great Cisco Live at the DevNet Zone and see you next year !");
            return;
        }

        var msg = "" + sessions.length + " upcoming activities:";
         var nbSessions = sessions.length;
         if (nbSessions > max) nbSessions=max;
         for (var i = 0; i < nbSessions; i++) {
             var current = sessions[i];
             msg += "\n- " + current.day + " " + current.begin + ": " + current.title + " at " + current.location + " by " + current.speaker;
        }
        
        sparkCallback (null,msg);
    });
}



//
// Utilities
//

function sendText(roomId, message) {
    sparky.message.send.room(roomId, {
        text: message
    }, function (err, results) {
        if (err) {
            console.log("could not send the text back to the room: " + err);
        }
        else {
            console.log("sendText command successful");
        }
    });
}

function sendImage(roomId, url) {
    sparky.message.send.room(roomId, {
        file: url
    }, function (err, results) {
        if (err) {
            console.log("could not send the image back to the room: " + err);
        }
        else {
            console.log("sendImage command successful");
        }
    });
}