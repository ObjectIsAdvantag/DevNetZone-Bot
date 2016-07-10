/*
 * Cisco Spark Bot to display current and next Activities,
 * and play a simple Quiz. 
 *
 */
var SparkBot = require("sparkbot-starterkit");
var Sparky = require("node-sparky");
var request = require("request");

var config = {
    // Required for the bot to push messages to Spark
    token: process.env.SPARK_TOKEN,

    integrationURI: process.env.INTEGRATION_URI || "/integration",

    webhookURI: process.env.WEBHOOK_URI || "/webhook",

    // This id is used to filxter all messages orginating from your bot
    // Note: you MUST replace this id by the account associated to the SPARK_TOKEN, otherwise you would encounter a never ending loop, as your bot will listen / write / listen / write...
    peopleId: process.env.BOT_PERSONID || "Y2lzY29zcGFyazovL3VzL1BFT1BMRS9hODYwYmFkZC0wNGZkLTQwYWEtYWFjNS05NmYyYWRhZDE3NTA",

    activitiesAPI: process.env.ACTIVITIES_API || "https://devnetzone.cleverapps.io/api/v1",
    maxActivities: process.env.ACTIVITIES_MAX || 5,
    commandNextActivities: process.env.COMMAND_NEXT || "next",
    commandCurrentActivities: process.env.COMMAND_CURRENT || "current",

    commandChallenge: process.env.COMMAND_CHALLENGE || "challenge",
    commandAnswer: process.env.COMMAND_ANSWER || "guess",
    commandHelp: process.env.COMMAND_HELP || "help",
    commandEuro: process.env.COMMAND_EURO || "euro"
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
    if ('/' != message.text.charAt(0)) {
        console.log("not a command => ignoring");
        return;
    }

    var splitted = message.text.substring(1).toLowerCase().split(' ');
    
    var command = splitted[0];
    if (!command)
    console.log("identified command: " + command);
    switch (command) {
        
        case config.commandNextActivities:
            var limit = splitted[1];
            if (!limit) limit = config.maxActivities;
            if (limit < 1) limit = 1;
            console.log("fetching next activities, max: " + limit);
            fetchNextActivities(limit, function (err, msg) {
                 if (!err) sendText(message.roomId, msg);
             });
            break;

        case config.commandCurrentActivities:
            var limit = splitted[1];
            if (!limit) limit = config.maxActivities;
            if (limit < 1) limit = 1;
            console.log("fetching current activities, max: " + limit);
            fetchCurrentActivities(limit, function (err, msg) {
                    if (!err) sendText(message.roomId, msg);
             });
            break;

        case config.commandHelp:
            displayHelp(message.roomId);
            break;

        default:
            displayDidNotRecognize(command, message.roomId);
            break;    
    }

});

function displayHelp(roomId) {
    sendText(roomId, "Welcome to the @CiscoDevNet Zone at #CLUS\n"
        + "   /" + config.commandNextActivities + " to check upcoming activities\n"
        + "   /" + config.commandCurrentActivities + " for current activities\n"
        );
}

function displayDidNotRecognize(command, roomId) {
    sendText(roomId, "Sorry, command /" + command + " is not supported\n"
        + "   /" + config.commandNextActivities + " to check upcoming activities\n"
        + "   /" + config.commandCurrentActivities + " for current activities\n"
        );
}


function showActivities(roomId) {
    var msg = fetchNextActivities(config.maxActivities);
    sendText(roomId, msg);
}

function fetchNextActivities(limit, sparkCallback) {

    // Get list of upcoming activities
    var options = {
        method: 'GET',
        url: config.activitiesAPI + "/activities/next?limit=" + limit
    };

    request(options, function (error, response, body) {
        if (error) {
            console.log("could not retreive list of activities, error: " + error);
            sparkCallback(new Error("Could not retreive upcoming activities, sorry [Activities API not responding]"), null);
            return;
        }

        if ((response < 200) || (response > 299)) {
            console.log("could not retreive list of activities, response: " + response);
            sparkCallback(new Error("Could not retreive upcoming activities, sorry [Activities API not responding]"), null);
            return;
        }

        var activities = JSON.parse(body);
        console.log("retreived " + activities.length + " activities: " + JSON.stringify(activities));

        if (activities.length == 0) {
            // [TODO] Check date is after latest activity
            sparkCallback(null, "No upcoming activity, event may over ?! Hope you had a great Cisco Live at the DevNet Zone and see you next year !");
            return;
        }

        var nbActivities = activities.length;
        var msg = "Here are the " + nbActivities + " upcoming activities";
        for (var i = 0; i < nbActivities; i++) {
            var current = activities[i];
            msg += "\n- " + current.beginDay + " " + current.beginTime + ": " + current.title + "\n   at " + current.location + " by " + current.speaker;
    }
    
    sparkCallback (null, msg);
    });
}

function fetchCurrentActivities(limit, sparkCallback) {

    // Get list of upcoming activities
    var options = {
        method: 'GET',
        url: config.activitiesAPI + "/activities/current?limit=" + limit
    };

    request(options, function (error, response, body) {
        if (error) {
            console.log("could not retreive list of activities, error: " + error);
            sparkCallback(new Error("Could not retreive current activities, sorry [Activities API not responding]"), null);
            return;
        }

        if ((response < 200) || (response > 299)) {
            console.log("could not retreive list of activities, response: " + response);
            sparkCallback(new Error("Could not retreive current activities, sorry [Activities API not responding]"), null);
            return;
        }

        var activities = JSON.parse(body);
        console.log("retreived " + activities.length + " activities: " + JSON.stringify(activities));

        if (activities.length == 0) {
            // [TODO] Check date is after latest activity
            sparkCallback(null, "No activity in the DevNet Zone currently. Type /next to check upcoming activities.");
            return;
        }

        var nbActivities = activities.length;
        var msg = "Here are the " + nbActivities + " current activities";
        for (var i = 0; i < nbActivities; i++) {
            var current = activities[i];
            msg += "\n- " + current.beginDay + " " + current.beginTime + ": " + current.title + "\n   at " + current.location + " by " + current.speaker;
    }
    
    sparkCallback (null, msg);
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