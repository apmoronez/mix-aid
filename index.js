require('dotenv').config();
const Redis_Storage = require('./redis_storage.js');
const Fs = require('fs');
const CSVParse = require('csv-parse');
const Express = require('express');
const App = Express();

// make sure all env vars are set
if (!process.env.REDIS_URL 
    || !process.env.PORT) {
    console.log('Error: [REDIS_URL, PORT] env vars must all be set!');
    process.exit(1);
}
// connect to Redis
var redis = new Redis_Storage({url: process.env.REDIS_URL})();

var loadparser = new CSVParse({columns: true}, function(err, output) {
    if (err) {
	console.log('Error parsing file: ' + err);
    }
    else {
	for (var i=0; i < output.length; i++) {
	    var card = {};
	    card.id = output[i].Season + '-' + output[i].CardNo;
	    card.season = output[i].Season;
	    card.level = output[i].Level;
	    card.artist = output[i].Artist;
	    card.song = output[i].Title;
	    card.playlist = output[i].Playlist;
	    card.artHash = output[i].ArtHash;
	    card.cardHash = output[i].CardHash;
	    if (output[i].Color == 'Wild') {
		var instruments = output[i].Instrument.split('|');
		if (instruments.length != 4) {
		    console.log("bad instrument value found on record " + i + ": " + output[i].Instrument);
		    continue;
		}
		card.isMulti = true;
		card.isYellow = true;
		card.yellowInstrument = instruments[0];
		card.isRed = true;
		card.redInstrument = instruments[1];
		card.isBlue = true;
		card.blueInstrument = instruments[2];
		card.isGreen = true;
		card.greenInstrument = instruments[3];
	    }
	    else if (output[i].Color == 'Lead') {
		card.isYellow = true;
		card.yellowInstrument = output[i].Instrument;
	    }
	    else if (output[i].Color == 'Loop') {
		card.isRed = true;
		card.redInstrument = output[i].Instrument;
	    }
	    else if (output[i].Color == 'Beat') {
		card.isBlue = true;
		card.blueInstrument = output[i].Instrument;
	    }
	    else if (output[i].Color == 'Bass') {
		card.isGreen = true;
		card.greenInstrument = output[i].Instrument;
	    }
	    else if (output[i].Color == 'White') {
		card.isWhite = true;
		card.isFX = true;
		card.FXRuleText = output[i].Notes;
	    }
	    else {
		console.log("bad color found on record " + i + ": " + output[i].Color);
		continue;
	    }
	    redis.saveCard(card, function(err, res) {
		if (err) {
		    console.log("error saving card, line " + i + ": " + err);
		}
	    });
	}
    }
});

var deleteparser = new CSVParse({columns: true}, function(err, output) {
    if (err) {
	console.log('Error parsing file: ' + err);
    }
    else {
	for (var i=0; i < output.length; i++) {
	    var card = {};
	    card.id = output[i].Season + '-' + output[i].CardNo;
	    redis.deleteCard(card, function(err, res) {
		if (err) {
		    console.log("error deleting card, line " + i + ": " + err);
		}
	    });
	}
    }
});

var getUI = function(req) {
    var fields = {
	Playlist: [
	    {
		playlist: [
                    { label: 'Sweets', value: 'Sweets'},
                    { label: 'Highness', value: 'Highness'},
                    { label: 'Blade', value: 'Blade'},
                    { label: 'Controller', value: 'Controller'},
                    { label: 'Derby', value: 'Derby'},
                    { label: 'Mirrors', value: 'Mirrors'},
                    { label: 'Ouroboros', value: 'Ouroboros'},
                    { label: 'Astro', value: 'Astro'},
                    { label: 'Lucky',value: 'Lucky'},
                    { label: 'Flawless',value: 'Flawless'},
                    { label: 'Bomb',value: 'Bomb'},
		],
	    },
	    {
		playlist: [
                    { label: 'Chiller',value: 'Chiller'},
                    { label: 'Dapper',value: 'Dapper'},
                    { label: 'Seer',value: 'Seer'},
                    { label: 'Hightower',value: 'Hightower'},
                    { label: 'Puff',value: 'Puff'},
                    { label: 'Fever',value: 'Fever'},
                    { label: 'Breaker',value: 'Breaker'},
                    { label: 'Socket',value: 'Socket'},
                    { label: 'Moonlight',value: 'Moonlight'},
                    { label: 'Baffler',value: 'Baffler'},
                    { label: 'DM(Promo)',value: 'DM'},
		],
	    },
	],
	Level: [
	    {
		level: [
		    { label: '1', value: 1},
		    { label: '2', value: 2},
		    { label: '3', value: 3},
		],
	    },
	],
	Color: [
	    {
		isYellow: [
                    { label: 'Yellow', value: 'true'},
		],
		isRed: [
                    { label: 'Red', value: 'true'},
		],
		isBlue: [
                    { label: 'Blue', value: 'true'},
		],
		isGreen: [
                    { label: 'Green', value: 'true'},
		],
		isWild: [
                    { label: 'Wild', value: 'true'},
		],
		isFX: [
                    { label: 'White/FX', value: 'true'},
		],
	    },
	],
	Instrument: [
	    {
		yellowInstrument: [
                    { label: 'Yellow Drums', value: 'Drums'},
                    { label: 'Yellow Guitar', value: 'Guitar'},
                    { label: 'Yellow Horns', value: 'Horns'},
                    { label: 'Yellow Keys', value: 'Keys'},
                    { label: 'Yellow Sampler', value: 'Sampler'},
                    { label: 'Yellow Strings', value: 'Strings'},
                    { label: 'Yellow Vocals', value: 'Vocals'},
		],
	    },
	    {
		redInstrument: [
                    { label: 'Red Drums', value: 'Drums'},
                    { label: 'Red Guitar', value: 'Guitar'},
                    { label: 'Red Horns', value: 'Horns'},
                    { label: 'Red Keys', value: 'Keys'},
                    { label: 'Red Sampler', value: 'Sampler'},
                    { label: 'Red Strings', value: 'Strings'},
                    { label: 'Red Vocals', value: 'Vocals'},
                ],
	    },
	    {
		blueInstrument: [
                    { label: 'Blue Drums', value: 'Drums'},
                    { label: 'Blue Guitar', value: 'Guitar'},
                    { label: 'Blue Horns', value: 'Horns'},
                    { label: 'Blue Keys', value: 'Keys'},
                    { label: 'Blue Sampler', value: 'Sampler'},
                    { label: 'Blue Strings', value: 'Strings'},
                    { label: 'Blue Vocals', value: 'Vocals'},
                ],
	    },
	    {
		greenInstrument: [
                    { label: 'Green Drums', value: 'Drums'},
                    { label: 'Green Guitar', value: 'Guitar'},
                    { label: 'Green Horns', value: 'Horns'},
                    { label: 'Green Keys', value: 'Keys'},
                    { label: 'Green Sampler', value: 'Sampler'},
                    { label: 'Green Strings', value: 'Strings'},
                    { label: 'Green Vocals', value: 'Vocals'},
                ],
	    },
	],
    };
	
    var output = "<h1>Gomez Mix-Aid</h1><br/>";

    output += "<form method=GET>Find cards that match <select name=connective>";
    var andSelected = "";
    var orSelected = "";
    if (req && req.query && req.query.connective) {
	if (req.query.connective == 'AND') {
	    andSelected = "selected";
	}
	if (req.query.connective == 'OR') {
	    orSelected = "selected";
	}
    }

    output += "<option value=AND " + andSelected + ">ALL</option><option value=OR " + orSelected + ">ANY</option>";
    output += "</select> of the following attributes:<br\><br\><table border=0 cellpadding=10 cellspacing=0><tr>";

    var sectionList = Object.keys(fields);
    for (var sectionIndex=0; sectionIndex < sectionList.length; sectionIndex++) {
	output += "<td valign=top><h2>" + sectionList[sectionIndex] + "</h2><table border=0 cellspacing=0 cellpadding=0><tr>";
	var groupList = fields[sectionList[sectionIndex]];
	for (var groupIndex=0; groupIndex < groupList.length; groupIndex++) {
	    output += "<td>";
	    var fieldList = Object.keys(groupList[groupIndex]);
	    for (var fieldListIndex=0; fieldListIndex < fieldList.length; fieldListIndex++) {
		for (var i=0; i < groupList[groupIndex][fieldList[fieldListIndex]].length; i++) {
		    var fieldData = groupList[groupIndex][fieldList[fieldListIndex]][i];
		    var checked = "";
		    if (req && req.query && req.query[fieldList[fieldListIndex]]) {
			var values = req.query[fieldList[fieldListIndex]];
			if (typeof(values) == 'string') {
			    if (values == fieldData.value) {
				checked = "checked";
			    }
			}
			else {
			    for (var j=0; j < values.length; j++) {
				if (values[j] == fieldData.value) {
				    checked = "checked";
				    break;
				}
			    }
			}
		    }
		    output += "<input type=checkbox name=" + fieldList[fieldListIndex] + " value=" + fieldData.value + " " + checked + " />" + fieldData.label + "<br/>";
		}
	    }
	    output += "</td>";
	}
	output += "</tr></table></td>";
    }
    output += "</tr></table>";
    output += "<br/><input type=submit value=Go /><input type=checkbox name=jsononly value=true />JSON response only</form>";
    output += "<br/><br/>Example queries:<br/>\
<a href='/?playlist=Mirrors'>/?playlist=Mirrors</a><br/>\
<a href='/?isGreen=true&level=2'>/?isGreen=true&level=2</a><br/>\
<a href='/?greenInstrument=Horns&yellowInstrument=Horns&redInstrument=Horns&connective=OR'>/?greenInstrument=Horns&yellowInstrument=Horns&redInstrument=Horns&connective=OR</a><br/>";
    return output;
};

var getCardImageHTML = function(data) {
    var outputHTML = "";
    for (var i=0; i < data.length; i++) {
	var img = "<img src=https://sad.hasbro.com/1200e194df42fdb4868a9811c626c142ad91b760/" + data[i].cardHash + ".png height=260 width=190 alt=\"" + data[i].artist + " - " + data[i].song + " (" + data[i].playlist + " " + data[i].id + ")\" />";
	outputHTML += img;
    }
    return outputHTML;
};

var cardSort = function(a,b) {
    return (a.id < b.id) ? -1 : ((a.id > b.id) ? 1 : 0);
};

App.get('/load-data', function(req, res) {
    var input = Fs.createReadStream(__dirname + '/cardlist.csv');
    input.pipe(loadparser);
    res.send('loaded data');
});

App.get('/delete-data', function(req, res) {
    var input = Fs.createReadStream(__dirname + '/cardlist.csv');
    input.pipe(deleteparser);
    res.send('deleted data');
});

App.get('/', function(req, res) {
    var query = req.query;
    var keys = Object.keys(query);
    if (!keys.length) {
	return res.send(getUI());
    }
    var searchParams = [];
    for (var i=0; i < keys.length; i++) {
	if (keys[i] == 'connective') {
	    continue;
	}
	var values = query[keys[i]];
	if (typeof(values) == 'string') {
	    searchParams.push({
		key: keys[i],
		value: values,
	    });
	}
	else {
	    for (var j=0; j < values.length; j++) {
		searchParams.push({
		    key: keys[i],
		    value: values[j],
		});
	    }
	}
    }
    if (query.connective == 'OR') {
	redis.getAllMatchingCardsBySetPairwiseMultipleOR(searchParams, function(err, data) {
	    if (err) {
		console.log("Error getting card: " + err);
		res.status(500).send("Error getting card data!");
	    }
	    else {
		data.sort(cardSort);
		if (query.jsononly) {
		    res.json(data);
		}
		else {
		    var output = getCardImageHTML(data);
		    res.send(getUI(req) + output + "<br/>JSON:<br/><pre>" + JSON.stringify(data) + "</pre>");
		}
	    }
	});
    }
    else {
	redis.getAllMatchingCardsBySetPairwiseMultipleAND(searchParams, function(err, data) {
	    if (err) {
		console.log("Error getting card: " + err);
		res.status(500).send("Error getting card data!");
	    }
	    else {
		data.sort(cardSort);
		if (query.jsononly) {
		    res.json(data);
		}
		else {
		    var output = getCardImageHTML(data);
		    res.send(getUI(req) + output + "<br/>JSON:<br/><pre>" + JSON.stringify(data) + "</pre>");
		}
	    }
	});
    }
});

App.listen(process.env.PORT, ()=>console.log('Gomez mix-aid running on port '+process.env.PORT));
