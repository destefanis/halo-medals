/**
 * Javascript file for equalizing the heights of the product tiles.
 */

(function ($) {
  'use strict'

  $('.js-button').click(function() {
    console.log("clicked");
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
        console.log(medal_data);
        fetchMatches(map_data, medal_data);
      }
    })
  }

  // Fetch the match history for the entered gamertag.
  function fetchMatches(map_data, medal_data) {

    $.jsonp({
      url: "https://www.haloapi.com/stats/h5/players/shesjustaglitch/matches?modes=warzone&start=0&count=3",
      beforeSend: function(xhrObj) {
        // Request headers
        xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key","ba39bd7104bf4cdf8385f925f2e709a1");
      },
      type: "GET",
      dataType: "json",
      success: function(matchHistory) {
        DetermineMatchType(matchHistory, map_data, medal_data);
      }
    })
    .done(function(data) {
      console.log("Success");
    })
    .fail(function() {
      console.log("Call not successful.");
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
        //console.log('arena');
      }
      else if (gameMode === 4) {
        gameMode = "warzone";
        FetchMatchDetails(matchId, map_data, medal_data, gameMode);
      }
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

            console.log(match);

            recentMatches.push(match);
            
            var matchCardTemplate = _.template($("#match-card").html());
            $("#recent-matches").append(matchCardTemplate({match: match}));
          }
        })

        // Loop through the players in the match and find
        // the stats for the player by their gamertag.
        $.each(match.PlayerStats, function(i, player) {
          if (this.Player.Gamertag === "Shesjustaglitch") {
            console.log(this);
            console.log(this.TotalSpartanKills);
            recentMatches.player = this;
            console.log(recentMatches.player);

            // Loop through the medals the player earned in this match.
            $.each(this.MedalAwards, function(i, medal) {

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
          }
        })

        var tableTemplate = _.template($("#medal-list").html());
        var medalList = "#" + match.id;
        $(medalList).append(tableTemplate({medalsEarned: medalsEarned}));
      }
    })
  }

  //var matchCard = _.template("<h1>Some text: <%= foo %></h1>");

})(jQuery);
