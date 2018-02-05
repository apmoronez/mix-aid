require('dotenv').config();
var Redis_Storage = require('./redis_storage.js');
var Fs = require('fs');
var CSVParse = require('csv-parse');

// make sure all env vars are set
if (!process.env.REDIS_URL 
    || !process.env.PORT) {
    console.log('Error: [REDIS_URL, PORT] env vars must all be set!');
    process.exit(1);
}
// connect to Redis
var redis = new Redis_Storage({url: process.env.REDIS_URL})();

var input = Fs.createReadStream(__dirname + '/cardlist.csv');
var parser = CSVParse({columns: true}, function(err, output) {
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
/*
input.pipe(parser);
console.log('loaded data');
*/

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

