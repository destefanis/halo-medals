/**
 * Javascript file for equalizing the heights of the product tiles.
 */


// API Key ba39bd7104bf4cdf8385f925f2e709a1
(function ($) {
  'use strict'


  function fetchMatches() {
    $.jsonp({
      url: "https://www.haloapi.com/stats/h5/players/shesjustaglitch/matches?modes=warzone&start=0&count=3",
      beforeSend: function(xhrObj) {
        // Request headers
        xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key","ba39bd7104bf4cdf8385f925f2e709a1");
      },
      type: "GET",
      dataType: "json",
      success: function(data) {
        var matchHistory = data;
        DetermineMatchType(matchHistory);
      }
    })
    .done(function(data) {
      console.log("Success");
    })
    .fail(function() {
      console.log("Call not successful.");
    });
  }

  function DetermineMatchType(matchHistory) {
    // Loop through recent matches.
    $.each(matchHistory.Results, function() {
      var matchId = this.Id.MatchId;
      var gameMode = this.Id.GameMode;

      // Games Modes are stored as an ints in the API.
      if (gameMode === 1) {
        console.log('arena');
      }
      else if (gameMode === 4) {
        console.log('warzone');
        FetchMatchDetails(matchId);
      }
    });
  }

  function FetchMatchDetails(matchId) {
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
        console.log(match);

        // $.each(match.PlayerStats, function(i, player) {
        //   console.log(this);
        // });

        // Map details aren't available from an API call for recent matches
        // or Carnage Reports, so instead we'll store the Map details in 
        // a switch for reference.
        switch(matchMap) {
          case "c89dae21-f206-11e4-a1c2-24be05e24f7e":
            var map = "Dispatch";
            var imageURL = "https://content.halocdn.com/media/Default/games/halo-5-guardians/map-images/warzone/dispatch-1ffec9cf5f754aa685f7a0c78824e70f.jpg";
          break;

          case "c822b1c0-f206-11e4-9755-24be05e24f7e":
            var map = "Summit";
            var imageURL = "https://content.halocdn.com/media/Default/games/halo-5-guardians/map-images/warzone/highlands-e3f65b315d5547ee97699b7e220f51c5.jpg";
          break;

          case "cae999f0-f206-11e4-9835-24be05e24f7e":
            var map = "Array";
            var imageURL = "https://content.halocdn.com/media/Default/games/halo-5-guardians/map-images/warzone/array-8818dd4d37074a0181588bf565a210b0.jpg";
          break;

          case "c854e54f-f206-11e4-bddc-24be05e24f7e":
            var map = "Raid on Apex 7";
            var imageURL = "https://content.halocdn.com/media/Default/games/halo-5-guardians/map-images/warzone/apex-04a7ffdd6aca4e48bc159ae754ca6585.jpg";
          break;

          case "c854e54f-f206-11e4-bddc-24be05e24f7e":
            var map = "March on Stormbreak";
            var imageURL = "https://content.halocdn.com/media/Default/games/halo-5-guardians/map-images/warzone/stormbreak-cbacd64e24bb432db9cf30ac66602284.jpg";
          break;

          case "c8d69870-f206-11e4-b477-24be05e24f7e":
            var map = "Escape from A.R.C";
            var imageURL = "https://content.halocdn.com/media/Default/games/halo-5-guardians/map-images/warzone/arc-f3f60a132fa746899ce9c2d340152ddb.jpg";
          break;
        }
        
        console.log(map);
      }
    })
  }

  function fetchMaps() {
    $.jsonp({
      url: "https://www.haloapi.com/metadata/h5/metadata/maps",
      beforeSend: function(xhrObj) {
        // Request headers
        xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key","ba39bd7104bf4cdf8385f925f2e709a1");
      },
      type: "GET",
      dataType: "json",
      // Request body
      success: function(maps) {
        console.log(maps);
      }
    })
  }

  fetchMatches();
  fetchMaps();

})(jQuery);
