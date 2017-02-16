var Sugar = require('sugar'); // sugarjs for dates
var pos = require('pos'); // part of speech tagger
var chrono = require('chrono-node');
var tempPluckedWord, remainWords;

var test = 'search flight from iad to sfo on dec 16th to 1/27/2017';
var test2 = "$5.25 Thanks for choosing Uber, Chris | POOL 02:36pm | 1717 Harrison St, San Francisco, CA 02:55pm | 651-693 Powell St, San Francisco, CA  You rode with NGHIA1.74 miles 00:19:13 Trip time POOL Car Rate Your Driver  UberEATS delivers the best meals from favorite local restaurants in as little as 10 minutes. Try it today using SFEATSRECEIPT for $5 off your first meal! You saved $5.24 by riding uberPOOLshare your savings Your FareTrip fare 5.25  Subtotal $5.25 CHARGED $5.25 Personal •••• 7403Transportation Network Company: Rasier-CA, LLC.xid01fad92b-3b5b-4a72-8520-e463b8ad74fb pGvlI2ANUbXFfyEOgxta1RMV082993 Invite your friends and family. Get a free ride worth up to $20 when you refer a friend to try Uber. Share code: vum78 Need help? Tap Help in your app to contact us with questions about your trip. Leave something behind? Track it down. Read about our zero tolerance policy. Report a zero tolerance complaint by visiting help.uber.com. January 22, 2017";
////console.log(posTagHash(testText));
////console.log(analyzeExpenseText(test));
//console.log(JSON.stringify(chrono.parse(test2)));

function quickGetDatesAmounts(testText) {
  var tempPluckedWord, remainWords;

  testText = testText.replace(/ +/g, ' '); //.replace(/^\s+|\s+$/g, ""); // remove all extra whitespace .replace(/\s+/g, " ");
  testText = testText.replace(/(\d+)(st|nd|rd|th)/, '$1'); // remove ordinal suffix 16th
  ////console.log("Input: " + testText);

  var remainWords = testText;
  console.log("Remain: " + remainWords);

  // Get the dates until none. push to an array
  var dates = [];
  do {
    tempPluckedWord = isolateDate2(remainWords);
    console.log("Plucked: " + tempPluckedWord);
    remainWords = remainWords.replace(tempPluckedWord, '');
    if (tempPluckedWord) dates.push(tempPluckedWord);
  } while (tempPluckedWord != '');
  //console.log('Date(s): ' + dates);

  // Get amounts until none
  var amounts = [];

  do {
    tempPluckedWord = isolateCurrency(remainWords);
    console.log('Plucked: ' + tempPluckedWord);
    remainWords = remainWords.replace(tempPluckedWord, '');
    if(tempPluckedWord) amounts.push(tempPluckedWord);
  } while (tempPluckedWord != '');

  return {
    'dates': dates,
    'amounts': amounts
  }
}

function analyzeExpenseText(testText) {

  var tempPluckedWord, remainWords;

  var amount = [];
  var vendor = [];
  var date = "NONE";
  var concur_tagged = [];
  var remain = "NONE";

  testText = testText.replace(/ +/g, ' '); //.replace(/^\s+|\s+$/g, ""); // remove all extra whitespace .replace(/\s+/g, " ");
  testText = testText.replace(/(\d+)(st|nd|rd|th)/, '$1'); // remove ordinal suffix 16th
  ////console.log("Input: " + testText);

  remainWords = testText;

  // Get the dates until none. push to an array
  var dates = [];
  do {
    tempPluckedWord = isolateDate2(remainWords);
    //console.log("Plucked: " + tempPluckedWord);
    remainWords = remainWords.replace(tempPluckedWord, '');
    if (tempPluckedWord) dates.push(tempPluckedWord);
  } while (tempPluckedWord != '');
  //console.log('Date(s): ' + dates);

  // Get amounts until none
  do {
    tempPluckedWord = isolateCurrency(remainWords);
    //console.log('Plucked: ' + tempPluckedWord);
    remainWords = remainWords.replace(tempPluckedWord, '');
    if(tempPluckedWord) amount.push(tempPluckedWord);
  } while (tempPluckedWord != '');
  //console.log('Amount(s): ' + amount);

  // Remove useless words. I can imagine this growing horribly over time
  remainWords = removePos('IN', remainWords); // From
  remainWords = removePos('TO', remainWords); // To
  remainWords = removePos('MD', remainWords); // Can
  remainWords = removePos('PRP', remainWords); // I, you, she
  //remainWords = removePos('JJ', remainWords); // Total, worth
  remainWords = removePos('CC', remainWords); // And
  remainWords = removePos('PRP$', remainWords); // My
  remainWords = removePos(':', remainWords); // -
  remainWords = removePos('VBG', remainWords); // Costing
  remainWords = removePos('VBP', remainWords); // Are
  remainWords = removePos('VBZ', remainWords); // Is

  // Isolate Concur key words
  // TODO: What if one of these words is a vendor name? e.g. Virgin Flights
  concur_tagged = collectDictionaryWords(['expense','expenses','receipt','receipts','flight','flights','create','submit','search','find','total'], remainWords.toLowerCase());
  //console.log("Concur tagged: " + concur_tagged);
  for(var i = 0, len = concur_tagged.length; i < len; i++)
    remainWords = remainWords.replace(concur_tagged[i], '');

  // Tag the remaining words
  remain = posTagHash(remainWords);
  //posIdentifier(remainWords);

  // All remaining nouns are moved to vendors for now. TODO
  vendor.push.apply(vendor, remain['NN']);
  vendor.push.apply(vendor, remain['NNS']);
  delete remain['NN'];
  delete remain['NNS'];

  // Put the outputs above to object
  var recognizedQuickExpense = {
    "amount": amount,
    "vendor": vendor,
    "dates": dates,
    "concur_tagged": concur_tagged,
    "remain": remain
  }

  //console.log(recognizedQuickExpense);
  return recognizedQuickExpense;
}

//=========================================================

// Plucks out a single date from an input text. To get multiple dates,
// you'd manually call this several times to feed revised text with
// prior dates deleted.  TODO: Write a recursive version
function isolateDate2(textInput) {
  var arrayInput = textInput.split(' ');
  var temp, createdDate, potentialDate, validDate = '';
  var potentialDates = [];

  // Loop through words with head pointer
  for (var i = 0, len_i = arrayInput.length; i < len_i; i++) {
    // Reset temp
    temp = '';
    // Sub-loop that loops as trailing pointer.  These two loops effectively
    // scan combinations of words from left to right to check whether they
    // are possible dates
    for (var j = i, len_j = arrayInput.length; j < len_j; j++) {

      if (temp) temp += ' ';
      temp += arrayInput[j];

      //console.log('Temp is now: ' + "'" + temp + "'");

      // Sugarjs magic
      createdDate = Sugar.Date.create(temp);
      // Is it potentially a date? We exclude dates of format 12.26
      if (createdDate != "Invalid Date" && !isolateCurrency(temp)) {
        //console.log('Temp before: ' + temp);

        // Need this because sugar accepts '- dec 16'
        //temp = temp.replace(/^[^a-zA-Z0-9]*|[^a-zA-Z0-9]*$/g, '');

        // Had to split this way because it's incorrectly removing the comma from 'december 16,'
        // This makes the plucked word not match up with any remainWords
        temp = temp.replace(/^[^a-zA-Z0-9]*/g, '').replace(/[^a-zA-Z0-9,]*$/g, '');
        potentialDate = temp;
        potentialDates.push(potentialDate);
        //console.log('------------  Potential date: [' + potentialDate + '] (' + temp + ')');

      } else if (potentialDate && createdDate == "Invalid Date") {
        // I'm not really sure why we still have this other than showing
        // strings invalidated by sugarjs
        //console.log("*** Invalid: '" + temp + "'");
      }
    }

    // j was not maxed out, we found a valid date then, and break out of i loop
    if (j < len_j.length - 1) break;
  }

  // Need to do this in case last word ended as a valid date (TODO: Not sure if we will still need this)
  //if(potentialDate) validDate = potentialDate;

  var tempDate;

  // Loop through array of potential dates to pick the best possible date
  for (var k = 0, len_k = potentialDates.length; k < len_k; k++) {
    tempDate = potentialDates[k];
    //console.log("Tag test----> [" + tempDate + "]");
    var pos_hash = posTagHash(tempDate.replace(',','')); // Remove comma just for pos count
    var pos_tag_count = Object.keys(pos_hash).length;
    if (
      // Preliminary tests show a valid date will not exceed 2 types of pos in a single text
      // A number is of type 'CD' (cardinal) and one other. This may change based on future
      // tests.  We're also blindly picking out the longest of these potential valid dates.
      ((pos_tag_count <= 2) && (tempDate.length > validDate.length)) ||
      //((pos_tag_count <= 3) && (tempDate.length > validDate.length) && (pos_hash["CD"] != undefined)) || // 16th December
      (false)
       ) {
      validDate = tempDate;
      //console.log('-------------VALID');
    }
  }

  //console.log('Valid date: ' + validDate);
  return validDate;
}

// Pluck out a currency of decimal or $ format from textInput
// Whole numbers are not considered currency for now
// TODO: Handle whole numbers properly or mark them ambiguous
function isolateCurrency(textInput) {
  var arrayInput = textInput.split(' ');
  var len = arrayInput.length;
  var i;
  var validCurrency = "";

  for (i = 0; i < len; i++) {
    if (isCurrency(arrayInput[i])) {
      validCurrency = arrayInput[i];
      break;
    }
  }

  return validCurrency;
}

// Regex to get amount
function isCurrency(num) {
  // Handle only $5 or 5.56, NOT 5
  if (isWholeNumber(num)) return false;
  return (num.match(/(?=.)^\$?(([1-9][0-9]{0,2}(,[0-9]{3})*)|[0-9]+)?(\.[0-9]{1,2})?$/)) ? true : false;
}

function isWholeNumber(n) {
  return n % 1 === 0;
}

// Returns an object hash of the words and the pos tags they belong to
function posTagHash(textInput) {
  var words = new pos.Lexer().lex(textInput);
  var tagger = new pos.Tagger();

  var taggedWords = tagger.tag(words);

  var pos_hash = {};

  for (i in taggedWords) {
    var taggedWord = taggedWords[i];
    var word = taggedWord[0];
    var tag = taggedWord[1];

    if (!pos_hash[tag]) pos_hash[tag] = [];
    pos_hash[tag].push(word);
  }

  //console.log(JSON.stringify(pos_hash) + " = " + Object.keys(pos_hash).length);
  return pos_hash;
}

function collectDictionaryWords(dictionary, inputText) {
  var tagged = [];
  var word_array = inputText.split(' ');

  for(var i = 0, len = word_array.length; i < len; i++) {
    //console.log('[collect] Testing: ' + word_array[i]);
    if(dictionary.indexOf(word_array[i]) > -1) {
      //console.log('.... Tagged!');
      tagged.push(word_array[i]);
    }
  }

  return tagged;
}

// Removes a particular word based on the type of pos
function removePos(target_tag, text) {
  var pos_hash = posTagHash(text);
  var to_remove = pos_hash[target_tag];
  var to_return = text;

  if (to_remove) {
    for (var i = 0, len = to_remove.length; i < len; i++) {
      to_return = to_return.replace(to_remove[i], '');
    }
  }

  return to_return;
}

// ------------------- UNUSED ------------------------

function posIdentifier(textInput) {
  var WordPOS = require('wordpos'),
    wordpos = new WordPOS();

  wordpos.getNouns(textInput, function(result) {
    //console.log(result);
  });
}

function posTagger1(textInput) {
  //var pos = require('pos');
  var words = new pos.Lexer().lex(textInput);
  var tagger = new pos.Tagger();

  var taggedWords = tagger.tag(words);

  var pos_hash_ctr = {};

  for (i in taggedWords) {
    var taggedWord = taggedWords[i];
    var word = taggedWord[0];
    var tag = taggedWord[1];

    if (!pos_hash_ctr[tag]) pos_hash_ctr[tag] = 0;
    pos_hash_ctr[tag]++;
    //console.log(word + " /" + tag);
  }
}

function isolateDate(textInput) {
  var arrayInput = textInput.split(' ');

  var isolatedDate = false;

  var ctr = 0;
  var len = arrayInput.length;
  var temp = arrayInput[ctr];
  var dateExists = false;
  var validDate = null;

  // Loop through word array until date is found or bust
  while (ctr <= len - 1 && !isolatedDate) {
    //console.log("------temp is " + temp);

    // If potential date is found...
    if ((Date.create(temp) != "Invalid Date") && (!isCurrency(arrayInput[ctr]))) {
      // ...
      dateExists = true;
      validDate = temp;

      // Reached the end, take this temp as valid
      if (ctr >= len - 1) {
        isolatedDate = true;
        //console.log("------valid date: " + validDate);
      }

    } else if (dateExists == true) {
      isolatedDate = true;
      //console.log("-------date exists: " + validDate);
    }

    if (ctr < len - 1) {
      if (!dateExists) {
        temp = arrayInput[ctr + 1];
      } else temp += ' ' + arrayInput[ctr + 1];
    }

    ctr++;
  }

  return validDate;
}

exports.analyzeExpenseText = analyzeExpenseText;
exports.quickGetDatesAmounts = quickGetDatesAmounts;
