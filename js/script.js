/**
 * Javascript file for equalizing the heights of the product tiles.
 */

(function ($) {
  'use strict'

  // Gamertag entered by the user.
  var userGamertag = "";

  // Gamertag for the API call url.
  var safeGamertag = "";

  // Selected Mode
  var selectedMode = "";

  // Variable for where we should start counting to retrieve matches.
  var resultCount = 0;
  var appCount = 0;

  // When the input field is updated, we need to set that value
  // to the gamertag, and replace spaces with plus characters so the gamertag
  // can be passed into the request URL.
  $('#gamertag-field').change(function() {
    if ($('#gamertag-field').val()!='') {
      userGamertag = $('#gamertag-field').val();
      safeGamertag = $('#gamertag-field').val().replace(/ +/g,'+').trim();
    }
  });

  $('.js-button').click(function(e) {
    e.preventDefault();

    // Update the preloader.
    $('.preloader__background').addClass('is--loading');
    $('.preloader__message').addClass('has-message');
    $('.preloader__message').text("Fetching Recent Matches");
    selectedMode = $('.select').val();
    // Fetch Maps
    fetchMaps();
  });

  // Fetch the list of maps available in the game. We need this data
  // to compare our match Map ID to it's corresponding map later on.
  function fetchMaps() {
    $.jsonp({
      url: "https://www.haloapi.com/metadata/h5/metadata/maps",
      beforeSend: function(xhrObj) {
        // Request headers
        xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key","ba39bd7104bf4cdf8385f925f2e709a1");
      },
      type: "GET",
      dataType: "json",

      success: function(map_data) {
        fetchMedals(map_data);
      }
    })
  }

  function fetchMedals(map_data) {
    $.jsonp({
      url: "https://www.haloapi.com/metadata/h5/metadata/medals",
      beforeSend: function(xhrObj) {
        // Request headers
        xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key","ba39bd7104bf4cdf8385f925f2e709a1");
      },
      type: "GET",
      dataType: "json",

      success: function(medal_data) {
        fetchMatches(map_data, medal_data);
      }
    })
  }

  // Fetch the match history for the entered gamertag.
  function fetchMatches(map_data, medal_data) {
    //var startCount = resultCount.toString();

    $.jsonp({
      url: "https://www.haloapi.com/stats/h5/players/" + safeGamertag + "/matches?modes=" + selectedMode + "&start=" + resultCount + "&count=3",
      beforeSend: function(xhrObj) {
        // Request headers
        xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key","ba39bd7104bf4cdf8385f925f2e709a1");
      },
      type: "GET",
      dataType: "json",
      success: function(matchHistory) {

        DetermineMatchType(matchHistory, map_data, medal_data);

        // Add 5 to the result count each time this method is run so that
        // the same matches aren't repeated.
        resultCount = resultCount + 3;
        $('.preloader__message').text("Recent Matches Found");
      }
    })
    .done(function(data) {
      console.log("Success");
    })
    .fail(function() {
      console.log("Call not successful.");
      $('.preloader__message').text("Error: An error occured and the attempt to fetch messages wasn't successful. Please try again.");
    });
  }

  // Determine the game mode for each match so we make the proper API
  // call for retreiving the match information.
  function DetermineMatchType(matchHistory, map_data, medal_data) {

    // Loop through recent matches.
    $.each(matchHistory.Results, function() {
      var matchId = this.Id.MatchId;
      var gameMode = this.Id.GameMode;

      // Games Modes are stored as an ints in the API.
      if (gameMode === 1) {
        gameMode = "arena";
      }
      else if (gameMode === 4) {
        gameMode = "warzone";
      }

      FetchMatchDetails(matchId, map_data, medal_data, gameMode);
    });
  }

  // Fetch the match information.
  function FetchMatchDetails(matchId, map_data, medal_data, gameMode) {

    $.jsonp({
      url: "https://www.haloapi.com/stats/h5/" + gameMode + "/matches/" + matchId,
      beforeSend: function(xhrObj) {
        // Request headers
        xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key","ba39bd7104bf4cdf8385f925f2e709a1");
      },
      type: "GET",
      dataType: "json",

      success: function(match) {
        var matchMap = match.MapId;
        var medals = medal_data;
        var recentMatches = [];
        var medalsEarned = [];

        // Loop through the list of maps we retrevied earlier
        // and compare our match id to each map, if it matches,
        // we set our map name and set our image.
        $.each(map_data, function() {
          if (matchMap === this.id) {
            match.MapName = this.name;
            match.MatchType = gameMode;
            match.MatchImage = this.imageUrl;
            match.id = matchId;

            $.each(match.PlayerStats, function(i, player) {
              var lowerTag = this.Player.Gamertag.toLowerCase();
              var lowerUserTag = userGamertag.toLowerCase();

              // The player list array in the match object uses the exact
              // gamertag string. If the user didn't capitalize their gamertag
              // exactly the same, it may not find them in the match.
              // Instead will try and match the user entered gamertag to a
              // player in the match, and if it doesn't work, we'll try again
              // after we make both strings lowercase.
              if (this.Player.Gamertag === userGamertag) {
                match.player = this;
              }
              else if (lowerTag === lowerUserTag) {
                match.player = this;
              }
              else {
                $('.preloader__message').text("There's an issue with your Gamertag, make sure it's entered correclty and try again.");
              }
            })

            recentMatches.push(match);
          }
        })
  
        // We want to display the most recent matches first, so we have to
        // reverse the order of the array.
        recentMatches.reverse();

        $.each(recentMatches, function(i, val) {

          $.jsonp({
            url: "https://www.haloapi.com/metadata/h5/metadata/map-variants/" + val.MapVariantId,
            beforeSend: function(xhrObj) {
              // Request headers
              xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key","ba39bd7104bf4cdf8385f925f2e709a1");
            },
            type: "GET",
            dataType: "json",

            success: function(map_variant_data) {
              val.Name = map_variant_data.name;
              var matchCardTemplate = _.template($("#match-card").html());
              $("#recent-matches").append(matchCardTemplate({match: val}));

              // Loop through the medals the player earned in this match.
              $.each(match.player.MedalAwards, function(i, medal) {

                // Medals in the Medal Array have ID's that are strings,
                // where in the post carnage results they're ints, so we need
                // to do a type conversion.
                var medalId = medal.MedalId;
                var Medalnum = medalId.toString();
                
                // Match the medal from our post game results to the medal array,
                // using the medal id.
                var result = _.findWhere(medals, {id: Medalnum});

                // Include the amount of times this medal was earned in the match.
                result.count = medal.Count;

                // Add all the medal objects to an array that we can loop through
                // in our template.
                medalsEarned.push(result);
              })

              // Append the medals to the match card.
              var tableTemplate = _.template($("#medal-list").html());
              var medalList = "#" + match.id;
              $(medalList).append(tableTemplate({medalsEarned: medalsEarned}));
            }
          })
        })

        $('.preloader__background').removeClass('is--loading');
        $('.preloader__message').text("");
        $('.preloader__message').removeClass('has-message');

        // $("#recent-matches").delegate(".match-card", "click", function (){
        //  var selectedId = $(this).attr("data-id");
          
          // $.each(recentMatches, function(i, match) {
          //   if (match.id === selectedId) {
              
          //     // Loop through the medals the player earned in this match.
          //     $.each(match.player.MedalAwards, function(i, medal) {

          //       // Medals in the Medal Array have ID's that are strings,
          //       // where in the post carnage results they're ints, so we need
          //       // to do a type conversion.
          //       var medalId = medal.MedalId;
          //       var Medalnum = medalId.toString();
                
          //       // Match the medal from our post game results to the medal array,
          //       // using the medal id.
          //       var result = _.findWhere(medals, {id: Medalnum});

          //       // Include the amount of times this medal was earned in the match.
          //       result.count = medal.Count;

          //       // Add all the medal objects to an array that we can loop through
          //       // in our template.
          //       medalsEarned.push(result);
          //     })
          //   }
          // })
          
          // Append the medals to the match card.
          // var tableTemplate = _.template($("#medal-list").html());
          // var medalList = "#" + match.id;
          // $(medalList).append(tableTemplate({medalsEarned: medalsEarned}));
        // })
      // }
    })
  }

})(jQuery);
