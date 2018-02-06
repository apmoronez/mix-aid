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

/*
var input = Fs.createReadStream(__dirname + '/cardlist.csv');
input.pipe(parser);
console.log('loaded data');
*/

/*
redis.getAllMatchingCardsBySetPairwiseMultipleOR([
    {
	key: 'yellowInstrument',
	value: 'Strings',
    },
    {
	key: 'redInstrument',
	value: 'Strings',
    },
    {
	key: 'blueInstrument',
	value: 'Strings',
    },
    {
	key: 'greenInstrument',
	value: 'Strings',
    },
], function(err, res) {
    if (err) {
	console.log("Error getting card: " + err);
    }
    else {
	console.log("Got cards!");
	console.dir(res);
    }
});
*/
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
	var output = "Valid fields<br>";
	var dataFields = redis.getDataFields();
	for (var i=0; i < dataFields.length; i++) {
	    if (dataFields[i].indexed) {
		output = output + dataFields[i].name + ": " + dataFields[i].type + "<br>";
	    }
	}
	output += "connective: [AND|OR] (defaults to AND)<br>";
	output += "<br><br>Example queries:<br>\
<a href='/?playlist=Mirrors'>/?playlist=Mirrors</a><br>\
<a href='/?isGreen=true&level=2'>/?isGreen=true&level=2</a><br>\
<a href='/?greenInstrument=Horns&yellowInstrument=Horns&redInstrument=Horns&connective=OR'>/?greenInstrument=Horns&yellowInstrument=Horns&redInstrument=Horns&connective=OR</a><br>";
	return res.send(output);
    }
    var searchParams = [];
    for (var i=0; i < keys.length; i++) {
	searchParams.push({
	    key: keys[i],
	    value: query[keys[i]],
	});
    }
    
    if (query.connective == 'OR') {
	redis.getAllMatchingCardsBySetPairwiseMultipleOR(searchParams, function(err, data) {
	    if (err) {
		console.log("Error getting card: " + err);
		res.status(500).send("Error getting card data!");
	    }
	    else {
		res.json(data);
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
		res.json(data);
	    }
	});
    }
});

App.listen(process.env.PORT, ()=>console.log('Gomez mix-aid running on port '+process.env.PORT));
