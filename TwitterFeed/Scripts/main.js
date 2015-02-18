﻿$(document).ready(function () {
// Initialize parse
Parse.initialize("gAyspTr9rHu70rWccCn3VLulVPoOHC1UfRjHLEwv", "QhwV529z16xqxF7IwVfelrtWKLj7fwBydyFVBQ4K");

var tweets = {}; // Holds the tweets
var newTweets = [];
var newTweetsQueue = [];
var oldestTweet = 0;
var bearerToken; // Auth object
var scrollInterval, settingsInterval, updateInterval; //Update intervals
var slideinitial = false;
var slidetime = 2000;
var pausetime = 5000;
var tweetshift = 1;
var totaltweets;
var currenttweet = 1; // Start at 1
var lasttweet = totaltweets;
var tweetheight = new Array();
var totalheight = 0;
var maxTweets;
var sliderheight = parseInt($('.tweets-container').css('height'));
var includeRTs;
var tweetQuery;
var filterExp;
var initialLoad = true;
var explicit = new RegExp("", "g");
var tweetViewModel = {
    tweets: ko.observableArray([
        // { tweetBody: "", handle: "", name: "", imageURL: "" } << Format
    ])
};

// Gets the OAuth token
function getToken() {
    // Get Bearer Token from endpoint
    $.ajax({
        url: '/Twitter/GetBearerToken',
        type: 'GET',
        async: false,
        success: function (results) {
            bearerToken = results;
        },
        error: function (error) {
            alert(error.status + " and " + error.statusText);
        }
    });
}

// Grabs the newest tweets
// uses the sinceID in twitter's API when neccessary
function getTweets() {   
    // Encode the query
    var fullQuery = "?q=" + encodeURIComponent(tweetQuery);

    // If we don't want retweets att "-RT to the query
    if (!includeRTs) {
        fullQuery += ' -RT';
    }

    // If we have gotten tweets dont do anything else, but if we have make sure there's a sinceID query value as to not get dupes.
    if (tweetViewModel.tweets().length > 0) {
        console.log(tweetViewModel.tweets().length);
        fullQuery += "&since_id=" + tweetViewModel.tweets()[oldestTweet].sinceID;

        //console.log("Searching since ID: " + tweetViewModel.tweets()[oldestTweet].sinceID);
        //console.log("Query: " + fullQuery);
    }
    
    // Search for Tweets if we have a token
    if (bearerToken) {
        $.ajax({
            url: '/Twitter/GetSearchJson',
            type: 'GET',
            async: false,
            data: { bearerToken: bearerToken, parameters: fullQuery },
            dataType: "JSON",
            success: function (results) {
                // Save a local copy either to the initial tweets or the temp newTweets
                if (tweetViewModel.tweets().length == 0) {
                    tweets = results.statuses;
                    // Format the tweets now.
                    formatTweets();
                }
                else {
                    newTweets = results.statuses;
                    updateTweets();
                }       
            },
            error: function (error) {
                alert(error.status + " and " + error.statusText);
            }
        });
    }
    else {
        // Retry and get new token if token ends up being too old.
        getToken();
        getTweets();
    } 
}

function getHeights() {
    console.log("Start height");
    for (var i = 1; i <= totaltweets; i++) {
        tweetheight[i] = parseInt($('#t' + i).css('height')) + parseInt($('#t' + i).css('padding-top')) + parseInt($('#t' + i).css('padding-bottom'));
        if (slideinitial === false) {
            sliderheight = 0;
        }
        if (i > 1) {

            $('#t' + i).css('top', tweetheight[i - 1] + totalheight + sliderheight);
            $('#t' + i).animate({
                'top': tweetheight[i - 1] + totalheight
            }, slidetime);
            totalheight += tweetheight[i - 1];
        } else {
            $('#t' + i).css('top', sliderheight);
            $('#t' + i).animate({
                'top': 0
            }, slidetime);
        }
    }
    totalheight += tweetheight[totaltweets];
    
    
    console.log("End height");

    // Start the scroll loop the first time you get tweets.
    if (initialLoad) {
        initialLoad = false;
        scrollInterval = setInterval(scrolltweets, pausetime);
        updateInterval = setInterval(getTweets, 10000);
        settingsInterval = setInterval(getSettings, 20000);
    }
    
}

// Explicit language filter
function languageFilter(tweetText) {
    // get rid of bad words.
    var result = explicit.test(tweetText);
    if (!result) {
        console.log("Filtered Tweet:");
        console.log(tweetText);
    }
    return result;
}

// Places the tweet from the json object
    // into the knockout observable.
    // initial Formatting.
function formatTweets() {
    console.log("Start format");

    oldestTweet = tweets.length - 1;
    totaltweets = tweets.length;
    
    lasttweet = totaltweets;

    // Format the JSON data into the KO observable start at the oldest Tweets and work forward pushing on the top of the ko
    for (var i = tweets.length - 1; i >= 0 ; i--) {
        // If we don't already have the tweet && make a filter check
        if ( languageFilter(tweets[i].text)) {

            var mediaURL = '';

            // If the tweet contains a picture show it.
            if (tweets[i].entities.media) {
                // Only allow 1 photo.
                for (var j = 0; j < 1; j++) {
                    if (tweets[i].entities.media[j].type == "photo") {
                        mediaURL = tweets[i].entities.media[j].media_url;
                    }
                }
            }

   
            // Format the tweet
            var tempTweet = {
                tweetBody: tweets[i].text,
                handle: "@" + tweets[i].user.screen_name,
                name: tweets[i].user.name,
                imageURL: tweets[i].user.profile_image_url,
                mediaURL: mediaURL,
                sinceID: tweets[i].id,
                id: "t" + (i + 1)
            };

            // Add the tweet to the feed
            tweetViewModel.tweets.unshift(tempTweet); 

            // If keep the feed at a limit of 'maxTweets' tweets.
            while (tweetViewModel.tweets().length > maxTweets) {
                tweetViewModel.tweets.pop();
            }
        }
    }
    
    // Get heights for the scrolling action
    getHeights();
}

// Animation Function
function scrolltweets() {
    
    // Replace the oldest tweet     
    insertNewTweet();

    var currentheight = 0;
    for (var i = 0; i < tweetshift; i++) {
        var nexttweet = currenttweet + i;
        if (nexttweet > totaltweets) {
            nexttweet -= totaltweets;
        }
        //console.log(nexttweet + " " + currenttweet);
        currentheight += tweetheight[nexttweet];
    }

    // Animate all the tweets.
    for (var i = 1; i <= totaltweets; i++) {
        $('#t' + i).animate({
            'top': (parseInt($('#t' + i).css('top')) - currentheight)
        }, slidetime, function () {

            var animatedid = parseInt($(this).attr('id').substr(1, 2));

            if (animatedid === totaltweets) {
                for (j = 1; j <= totaltweets; j++) {
                    if (parseInt($('#t' + j).css('top')) < -50) {
                        var toppos = parseInt($('#t' + lasttweet).css('top')) + tweetheight[lasttweet];
                        $('#t' + j).css('top', toppos);
                        lasttweet = j;

                        if (currenttweet >= totaltweets) {
                            var newcurrent = currenttweet - totaltweets + 1;
                            currenttweet = newcurrent;
                        } else {
                            currenttweet++;
                        }
                    }
                }

            }
        });
    }
    
}

// Retreive settings from parse.
function getSettings() {
    var Settings = Parse.Object.extend("Feed");
    var query = new Parse.Query(Settings);
    query.get("EJlZOI6Lhu", {
        success: function (settings) {
            // The object was retrieved successfully.
            totaltweets = settings.get("maxTweets");
            includeRTs = settings.get("includeRT");
            tweetQuery = settings.get("query");

            var filterArr = settings.get("filter");
            filterExp = "\\b(";     
            for(var i = 0; i < filterArr.length; i++){
                filterExp+= "|";
                filterExp+= filterArr[i];
            }
            filterExp += ")\\b";
            explicit = new RegExp(filterExp, "g");
            // Then get the tweets
            
            getTweets();
        },
        error: function (object, error) {
            // The object was not retrieved successfully.
            // error is a Parse.Error with an error code and message.
            getSettings();
        }
    });
}

function updateTweets() {
    newFormattedTweets = {};
    for (var i = newTweets.length - 1; i >= 0 ; i--) {
        console.log("Updating");
        // If we don't already have the tweet... & make a filter check
        if (languageFilter(newTweets[i].text)) {
            var mediaURL = '';

            // If the tweet contains a picture show it.
            if (newTweets[i].entities.media) {
                // Only allow 1 photo.
                for (var j = 0; j < 1; j++) {
                    if (newTweets[i].entities.media[j].type == "photo") {
                        mediaURL = newTweets[i].entities.media[j].media_url;
                    }
                }
            }

            // Format the tweet
            var tempTweet = {
                tweetBody: newTweets[i].text,
                handle: "@" + newTweets[i].user.screen_name,
                name: newTweets[i].user.name,
                imageURL: newTweets[i].user.profile_image_url,
                mediaURL: mediaURL,
                sinceID: newTweets[i].id,
                id: "t"
            };

            console.log(tempTweet);
            // Push the new tweets to the "queue"
            // They will be added in as they can
            // Need to add the ID before it gets added.
            newTweetsQueue.push(tempTweet);
        }
    }
    
}

function insertNewTweet() {
    // Check if new tweets are avaliable && the oldest tweet is past the top
    if (newTweetsQueue.length > 0 && parseInt($('#t' + j).css('top')) < -50) {

        // Shift Tweet into feed, it is removed from the front of the queue
        tweetViewModel.tweets.splice(oldestTweet, 1, newTweetsQueue.shift());

        // Calculate the "new" oldest tweet
        if (oldestTweet == 0) {
            oldestTweet = tweets.length - 1;
        }
        else {
            oldestTweet--;
        }
        console.log("Oldest TweetLoc: " + oldestTweet);

        // Get heights for the scrolling action
        getHeights();
    }
}
// Apply knockout bindings
ko.applyBindings(tweetViewModel);

// Start the process of getting and animating tweets  
// Get the settings from Parse before doing anything
getSettings();

});