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
    $('.description-box').addClass('is-visible');
    $('.description-box__name').html("Status");
    $('.description-box__description').html("Searching for recent matches.");
    selectedMode = $('.select').val();

    if ($('#gamertag-field').val() === '') {
      $('.description-box__name').html("Error");
      $('.description-box__description').html("Gamertag field empty!");
    } 
    else {
      fetchMaps();
      $('.preloader__background').addClass('is--loading');
    }
  });


  function fetchMaps() {
    // Fetch the list of maps available in the game. We need this data
    // to compare our match Map ID to it's corresponding map later on.
    $.ajax({
      url: "http://www.halomedals.io/json/maps.json",
      type: "GET",
      dataType: "json",

      success: function(map_data) {
        fetchMedals(map_data);
      }
    })
  }


  function fetchMedals(map_data) {
    $.ajax({
      url: "http://www.halomedals.io/json/medals.json",
      type: "GET",
      dataType: "json",

      success: function(medal_data) {
        fetchMatches(map_data, medal_data);
      }
    })
  }


  function fetchMatches(map_data, medal_data) {
    // Fetch the match history for the entered gamertag.

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

        // Add 3 to the result count each time this method is run so that
        // the same matches aren't repeated.
        resultCount = resultCount + 3;
        $('.description-box').addClass('is-loading');
        $('.description-box__name').html("Success");
        $('.description-box__description').html("Recent Matches Found");
      },
      statusCode: {
        429: function() {
          $('.description-box__name').html("Error");
          $('.description-box__description').html("Maxmium API calls reached due to traffic. Please try again in 10 seconds.");
          $('.preloader__background').removeClass('is--loading');
        }
      } 

    })
    .fail(function() {
      $('.description-box__name').html("Error");
      $('.description-box__description').html("The attempt to fetch recent matches wasn't successful, please try again.");
      $('.preloader__background').removeClass('is--loading');
    });
  }


  function DetermineMatchType(matchHistory, map_data, medal_data) {
    // Determine the game mode for each match so we make the proper API
    // call for retreiving the match information.

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
                $('.description-box').removeClass("is-loading");
                $('.description-box__name').html("Error");
                $('.description-box__description').html("There's an issue with your Gamertag, make sure it's entered correclty and try again.");
              }
            })

            recentMatches.push(match);
          }
        })
  
        // We want to display the most recent matches first, so we have to
        // reverse the order of the array.
        recentMatches.reverse();

        $.each(recentMatches, function(i, val) {

          // Declare our Underscores template for our match card.
          var matchCardTemplate = _.template($("#match-card").html());

          // Breakout Maps are actually all variants built off the same
          // base map. So we need to check what the variant is, otherwise
          // it just dispays as "Breakout Arena".
          if (val.MapId === "c7edbf0f-f206-11e4-aa52-24be05e24f7e") {;
            $.jsonp({
              url: "https://www.haloapi.com/metadata/h5/metadata/map-variants/" + val.MapVariantId,
              beforeSend: function(xhrObj) {
                // Request headers
                xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key","ba39bd7104bf4cdf8385f925f2e709a1");
              },
              type: "GET",
              dataType: "json",

              success: function(map_variant_data) {
                // Our Map name is actually the name of the variant.
                val.Name = map_variant_data.name;
                $("#recent-matches").append(matchCardTemplate({match: val}));
              }
            })
          }
          else {
            val.Name = val.MapName;
            $("#recent-matches").append(matchCardTemplate({match: val}));
          }

          // Show the load more button
          $('.page__controls').addClass('is-visible');

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
        })

        $('.description-box').removeClass("is-visible is-loading");
        $('.preloader__background').removeClass('is--loading');
      },
      statusCode: {
        429: function() {
          $('.description-box__name').html("Error");
          $('.description-box__description').html("Maxmium API calls reached due to traffic. Please try again in 10 seconds.");
          $('.preloader__background').removeClass('is--loading');
        }
      }
    })
  }

  $('.button--load-more').click(function(e) {
    e.preventDefault();

    fetchMaps();
    $('.preloader__background').addClass('is--loading');
  });

  // Various click events for toggling UI elements.
  $("#recent-matches").delegate(".match-card", "click", function() {
    $(this).toggleClass('medals-visible');
    $(this).next('.match-card__report').toggleClass('is-visible');
    $('.description-box').removeClass('is-visible');
  });

  $("#recent-matches").delegate(".close-button", "click", function() {
    $(this).closest('.match-card__report').removeClass('is-visible');
    $(this).closest('.match-card__report').prev('.match-card').removeClass('medals-visible');
    $('.description-box').removeClass('is-visible');
  });

  $("#recent-matches").delegate(".medal-list__item", "click", function() {
    var medalModalDescription = $(this).find('.medal-content').attr('data-description');
    var medalModalName = $(this).find('.medal-content').attr('data-name');
    $('.description-box').addClass('is-visible');
    $('.description-box__name').html(medalModalName);
    $('.description-box__description').html(medalModalDescription);
  });

  $(".message-close").click(function() {
    $('.description-box').removeClass('is-visible');
  });

})(jQuery);
