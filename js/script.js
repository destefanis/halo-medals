/**
 * Javascript file for equalizing the heights of the product tiles.
 */

(function ($) {
  'use strict'

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
        fetchMatches(map_data);
      }
    })
  }

  function fetchMedals() {
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
      }
    })
  }

  // Fetch the match history for the entered gamertag.
  function fetchMatches(map_data) {

    $.jsonp({
      url: "https://www.haloapi.com/stats/h5/players/shesjustaglitch/matches?modes=warzone&start=0&count=3",
      beforeSend: function(xhrObj) {
        // Request headers
        xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key","ba39bd7104bf4cdf8385f925f2e709a1");
      },
      type: "GET",
      dataType: "json",
      success: function(matchHistory) {
        DetermineMatchType(matchHistory, map_data);
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
  function DetermineMatchType(matchHistory, map_data) {

    // Loop through recent matches.
    $.each(matchHistory.Results, function() {
      var matchId = this.Id.MatchId;
      var gameMode = this.Id.GameMode;

      // Games Modes are stored as an ints in the API.
      if (gameMode === 1) {
        //console.log('arena');
      }
      else if (gameMode === 4) {
        //console.log('warzone');
        FetchMatchDetails(matchId, map_data);
      }
    });
  }

  // Fetch the match information.
  function FetchMatchDetails(matchId, map_data) {
    $.jsonp({
      url: "https://www.haloapi.com/stats/h5/warzone/matches/" + matchId,
      beforeSend: function(xhrObj) {
        // Request headers
        xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key","ba39bd7104bf4cdf8385f925f2e709a1");
      },
      type: "GET",
      dataType: "json",

      success: function(match) {
        var matchMap = match.MapId;
        var maps = map_data;

        // Loop through the list of maps we retrevied earlier
        // and compare our match id to each map, if it matches,
        // we set our map name and set our image.
        $.each(maps, function() {
          if (matchMap === this.id) {
            console.log(this.name);
            console.log(this.imageUrl);
          }
        })

        // Loop through the players in the match and find
        // the stats for the player by their gamertag.
        $.each(match.PlayerStats, function(i, player) {
          if (this.Player.Gamertag === "Shesjustaglitch") {
            console.log(this);
            console.log(this.TotalSpartanKills);
          }
        })
      }
    })
  }

  fetchMaps();
  fetchMedals();

})(jQuery);
