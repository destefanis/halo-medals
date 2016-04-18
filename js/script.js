/**
 * Javascript file for equalizing the heights of the product tiles.
 */

(function ($) {
  'use strict'

  var userGamertag = ""; // Gamertag entered by the user.
  var safeGamertag = ""; // Gamertag for the API call url.
  var selectedMode = "";
  var weaponData = {};
  var rankingData = {};

  // Variable for where we should start counting to retrieve matches.
  var resultCount = 0;
  var appCount = 0;

  // Clicking the button intializes the application.
  $('.js-button').click(function(e) {
    e.preventDefault();
    runApp();
  });

  // If the user hits enter, we should run the app.
  $('.input-field').keypress(function(e) {
    if (e.which == 13) {
      runApp();
      return false;
    }
  });

  function runApp() {
    // Basic steps for initiating the application.
    userGamertag = $('#gamertag-field').val();
    safeGamertag = $('#gamertag-field').val().replace(/ +/g,'+').trim();

    // Update the preloader.
    $('.description-box').addClass('is-visible');
    $('.description-box__name').html("Status");
    $('.description-box__description').html("Searching for recent matches.");
    selectedMode = $('.select').val();

    if ($('#gamertag-field').val() === '') {
      $('.description-box__name').html("Error");
      $('.description-box__description').html("Gamertag field empty! Enter your gamertag and try again.");
    } 
    else {
      fetchMaps();
      var currentUrl = window.location.href;
      var newUrl = replaceUrlParam(currentUrl, "gamertag", safeGamertag);
      window.history.pushState(newUrl, "Title", newUrl);
      $('.preloader__background').addClass('is--loading');
    }

    if (jQuery.isEmptyObject(weaponData)) {
      fetchWeapons();
    }

    if (jQuery.isEmptyObject(rankingData)) {
      fetchCSR();
    }
  }

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
    $.jsonp({
      url: "https://www.haloapi.com/metadata/h5/metadata/medals",
      beforeSend: function(xhrObj) {
        // Request headers
        xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key","adb9ae6a4e454200ac1d1093af6b29f1");
      },
      type: "GET",
      dataType: "json",
      success: function(medal_data) {
        fetchMatches(map_data, medal_data);
      }
    })
  }


  function fetchWeapons() {
    $.ajax({
      url: "http://www.halomedals.io/json/weapons.json",
      type: "GET",
      dataType: "json",

      success: function(weapon_data) {
        weaponData = weapon_data;
      }
    })
  }

  function fetchCSR() {
    $.jsonp({
      url: "https://www.haloapi.com/metadata/h5/metadata/csr-designations",
      beforeSend: function(xhrObj) {
        // Request headers
        xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key","[your-key]");
      },
      type: "GET",
      dataType: "json",
      success: function(csr_data) {
        rankingData = csr_data;
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


  function fetchMatches(map_data, medal_data) {
    // Fetch the match history for the entered gamertag.

    $.jsonp({
      url: "https://www.haloapi.com/stats/h5/players/" + safeGamertag + "/matches?modes=" + selectedMode + "&start=" + resultCount + "&count=3",
      beforeSend: function(xhrObj) {
        // Request headers
        xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key","[your-key]");
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
      var gameDate = this.MatchCompletedDate.ISO8601Date;

      // Games Modes are stored as an ints in the API.
      if (gameMode === 1) {
        gameMode = "arena";
      }
      else if (gameMode === 4) {
        gameMode = "warzone";
      }

      FetchMatchDetails(matchId, map_data, medal_data, gameMode, gameDate);
    });
  }


  function FetchMatchDetails(matchId, map_data, medal_data, gameMode, gameDate) {

    $.jsonp({
      url: "https://www.haloapi.com/stats/h5/" + gameMode + "/matches/" + matchId,
      beforeSend: function(xhrObj) {
        // Request headers
        xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key","[your-key]");
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

            // Native string function for converting iso 8601 timestamp.
            var timeStamp = match.TotalDuration;
            var formattedTime = timeStamp.replace("PT","").replace("H",":").replace("M","MIN ");
            match.MatchLength = formattedTime.substring(0, formattedTime.indexOf('.')) + "SEC";

            // Use substring function for formatting the date.
            var date = gameDate;
            var dateWithoutTime = date.substring(0, date.indexOf('T'));
            var formattedDate = dateWithoutTime.substring(5);
            match.DateStamp = formattedDate.replace(/^0+/, '').replace("-","/");

            $.each(match.PlayerStats, function(i, player) {
              var lowerTag = this.Player.Gamertag.toLowerCase();
              var lowerUserTag = userGamertag.toLowerCase();

              // Determine KDA spread.
              var spread = (player.TotalSpartanKills + player.TotalAssists) / player.TotalDeaths;
              var spreadRounded = Math.round(spread * 100) / 100;
              var damage = parseFloat(player.TotalGroundPoundDamage + player.TotalWeaponDamage + player.TotalMeleeDamage + player.TotalGrenadeDamage + player.TotalPowerWeaponDamage);
              player.TotalDamage = damage.toFixed();

              var accuracy = Math.round(player.TotalShotsLanded / player.TotalShotsFired * 100);
              player.TotalAccuracy = accuracy;

              if (isNaN(spreadRounded)) {
                player.KDASpread = "N/A";
              }
              else {
                player.KDASpread = Math.round(spread * 100) / 100;  
              }

              // Determine the rank of each player.
              if (player.PreviousCsr != null) {
                $.each(rankingData, function(i, rank){
                  if (rank.id == player.PreviousCsr.DesignationId) {
                   player.PreviousRankTitle = rank.name;

                    $.each(rank.tiers, function(i, tier){
                      if (tier.id == player.PreviousCsr.Tier) {
                        player.PreviousCSRIcon = tier.iconImageUrl;
                        return;
                      }
                    })
                  }
                })
              }

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

        $.each(recentMatches, function(i, val) {

          // Declare our Underscores template for our match card.
          var matchCardTemplate = _.template($("#match-card").html());
          var matchScore = 0;
          var winningTeam = 0;

          // How much XP the player earned this match.
          val.player.TotalXPEarned = val.player.XpInfo.TotalXP - val.player.XpInfo.PrevTotalXP;

          // Check to see if the player didn't finish the match.
          if (match.player.DNF != true) {
            // Loop through the teams in this match.
            $.each(match.TeamStats, function(i, team) {

              if (team.Score > matchScore) {
                matchScore = team.Score;
                winningTeam = team.TeamId;

                if (match.player.TeamId === winningTeam) {
                  match.player.MatchStatus = "Victory";
                }
                else {
                  match.player.MatchStatus = "Defeat";
                }
              }
            })
          }
          else {
            match.player.MatchStatus = "DNF";
          }

          // Loop through the weapons data to determine our top weapon
          // information, including name and image url.
          $.each(weaponData, function(i, weapon) {
            if (weapon.id == val.player.WeaponWithMostKills.WeaponId.StockId) {
              val.player.WeaponWithMostKills.WeaponName = weapon.name;
              val.player.WeaponWithMostKills.WeaponURL = weapon.smallIconImageUrl;
              return false;
            }
          })

          if (val.player.PreviousCsr != null) {
            $.each(rankingData, function(i, rank){
              if (rank.id == val.player.PreviousCsr.DesignationId) {
                val.player.PreviousRankTitle = rank.name;

                $.each(rank.tiers, function(i, tier){
                  if (tier.id == val.player.PreviousCsr.Tier) {
                    val.player.PreviousCSRIcon = tier.iconImageUrl;
                  }
                })
              }
            })
          }

          if (val.player.CurrentCsr != null) {
            $.each(rankingData, function(i, rank){
              if (rank.id == val.player.CurrentCsr.DesignationId) {
                val.player.CurrentRankTitle = rank.name;

                $.each(rank.tiers, function(i, tier){
                  if (tier.id == val.player.CurrentCsr.Tier) {
                    val.player.CurrentCSRIcon = tier.iconImageUrl;
                  }
                })
              }
            })
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

          // Add a medals list to our 'val' object.
          val.medalsEarned = medalsEarned;

          // Breakout Maps are actually all variants built off the same
          // base map. So we need to check what the variant is, otherwise
          // it just dispays as "Breakout Arena".
          if (val.MapId === "c7edbf0f-f206-11e4-aa52-24be05e24f7e") {
            $.jsonp({
              url: "https://www.haloapi.com/metadata/h5/metadata/map-variants/" + val.MapVariantId,
              beforeSend: function(xhrObj) {
                // Request headers
                xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key","[your-key]");
              },
              type: "GET",
              dataType: "json",

              success: function(map_variant_data) {
                // Our Map name is actually the name of the variant.
                val.Name = map_variant_data.name;
                $("#recent-matches").append(matchCardTemplate({match: val}));
                // Determine rank progression for ranked arena matches.
                determineRank(val);
              }
            })
          }
          else {
            val.Name = val.MapName;
            $("#recent-matches").append(matchCardTemplate({match: val}));
          }

          if (val.MatchType === "arena") {
            determineRank(val);
          }

        })

        $('.description-box').removeClass("is-visible is-loading");
        $('.preloader__background').removeClass('is--loading');
        $('.button--load-more').removeClass('is--loading-button');
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

  // Determines rank progression in Arena matches.
  function determineRank(val) {
    var startValue;
    var nextRankValue;
    var previousValue;
    var angleStart;
    var reportID = '#report-' + val.id;

    // If the player ranked up.
    // If player is unranked.
    if (val.player.PreviousCsr === null && val.player.MeasurementMatchesLeft > -1) {
      $(reportID).find('.progress-stats__number').html(val.player.MeasurementMatchesLeft);
      $(reportID).find('.report__header--rank').text('Placement Matches Left:');
    }
    else if (val.player.CurrentCsr.DesignationId === 6) {
      $(reportID + ' #previous-rank-circle').addClass('no-graph');
      $(reportID).find('.progress-stats__number').html(val.player.CurrentCsr.Csr);
      $(reportID).find('.report__header--rank-title').text(val.player.PreviousCsr.Csr + " " + val.player.CurrentRankTitle);
    }
    else if (val.player.CurrentCsr.DesignationId === 7) {
      $(reportID + ' #previous-rank-circle').addClass('no-graph');
      $(reportID).find('.progress-stats__number').html(val.player.CurrentCsr.Rank);
      $(reportID).find('.report__header--rank-title').text(val.player.CurrentRankTitle + " " + val.player.PreviousCsr.Rank);
    }
    else if (val.player.CurrentCsr.PercentToNextTier < val.player.PreviousCsr.PercentToNextTier && val.player.CurrentCsr.Tier > val.player.PreviousCsr.Tier) {
      startValue = val.player.PreviousCsr.PercentToNextTier / 100;
      nextRankValue = val.player.CurrentCsr.PercentToNextTier / 100;
      angleStart = val.player.PreviousCsr.PercentToNextTier * 3.6;
      reportID = '#report-' + val.id;
  
      // Progress Circle Animation
      $('#report-' + val.id + ' #previous-rank-circle').circleProgress({
        startAngle: (-Math.PI / 2) + (angleStart * 0.01745),
        emptyFill: 'rgba(90, 90, 102, 1)',
        value: 1 - startValue,
        size: 80,
        thickness: 4,
        fill: {
          gradient: ["#85F7D3", "#5DFDCB"]
        }
      });

      $(reportID + ' #previous-rank-circle').on('circle-animation-end', function(event) {
        $(reportID).find('.progress-stats__number').html("+" + parseInt(((1 - startValue) + nextRankValue) * 100) + "%");
        $(reportID).find('.report__header--rank-title').text(val.player.CurrentRankTitle + " " + val.player.PreviousCsr.Tier + " (RANK UP!)");
      });
    }
    // If the player won a match but didn't rank up.
    else if (val.player.CurrentCsr.PercentToNextTier > val.player.PreviousCsr.PercentToNextTier && val.player.CurrentCsr.Tier === val.player.PreviousCsr.Tier) {
      startValue = val.player.CurrentCsr.PercentToNextTier / 100;
      previousValue = val.player.PreviousCsr.PercentToNextTier / 100;
      angleStart = (val.player.PreviousCsr.PercentToNextTier * 3.6);

      // Progress Circle Animation
      $(reportID + ' #previous-rank-circle').circleProgress({
        startAngle: -Math.PI / 2,
        value: startValue,
        emptyFill: 'rgba(255, 255, 255, 1)',
        size: 80,
        thickness: 4,
        fill: {
          gradient: ["#85F7D3", "#5DFDCB"]
        }
      })

      $(reportID + ' #previous-rank-circle').on('circle-animation-end', function(event) {
        $(reportID).find('.progress-stats__number').html("+" + parseInt((startValue - previousValue) * 100) + "%");
        $(reportID).find('.report__header--rank-title').text(val.player.CurrentRankTitle + " " + val.player.CurrentCsr.Tier);
      });
    }
    // If the player lost some CSR but didn't downrank.
    else if (val.player.CurrentCsr.PercentToNextTier < val.player.PreviousCsr.PercentToNextTier && val.player.CurrentCsr.Tier <= val.player.PreviousCsr.Tier) {
      startValue = val.player.CurrentCsr.PercentToNextTier / 100;
      previousValue = val.player.PreviousCsr.PercentToNextTier / 100;
      angleStart = (val.player.PreviousCsr.PercentToNextTier * 3.6);
  
      // Progress Circle Animation
      $(reportID + ' #previous-rank-circle').circleProgress({
        startAngle: (-Math.PI / 2) + (angleStart * 0.01745),
        value: startValue,
        reverse: true,
        size: 80,
        thickness: 4,
        fill: { color: "#F06449" }
      });

      $('#report-' + val.id + ' #previous-rank-circle').on('circle-animation-end', function(event) {
        $('#report-' + val.id).find('.progress-stats__number').html("-" + parseInt((previousValue - startValue) * 100) + "%");
        $(reportID).find('.report__header--rank-title').text(val.player.CurrentRankTitle + " " + val.player.CurrentCsr.Tier);
      });
    }
    // If the player downranks.
    else if (val.player.CurrentCsr.PercentToNextTier > val.player.PreviousCsr.PercentToNextTier && val.player.CurrentCsr.Tier < val.player.PreviousCsr.Tier) {
      startValue = val.player.CurrentCsr.PercentToNextTier / 100;
      previousValue = val.player.PreviousCsr.PercentToNextTier / 100;
      angleStart = (val.player.PreviousCsr.PercentToNextTier * 3.6);
  
      // Progress Circle Animation
      $('#report-' + val.id + ' #previous-rank-circle').circleProgress({
        startAngle: -Math.PI / 2,
        value: startValue,
        size: 80,
        thickness: 4,
        emptyFill: 'rgba(240, 100, 73, 1)',
        fill: { color: "#5A5A66" }
      });

      $('#report-' + val.id + ' #previous-rank-circle').on('circle-animation-end', function(event) {
        $('#report-' + val.id).find('.progress-stats__number').html("-" + parseInt(((1 - startValue) + previousValue) * 100) + "%");
        $(reportID).find('.report__header--rank-title').text(val.player.PreviousRankTitle + " " + val.player.PreviousCsr.Tier);
      });
    }
  }

  // Fetch additional matches when the load more button is pressed.
  $('.button--load-more').click(function(e) {
    e.preventDefault();

    fetchMaps();
    $('.preloader__background').addClass('is--loading');
    $(this).addClass('is--loading-button');
  });

  // Reset Button Behaviors
  $('.button--reset').click(function(e) {
    e.preventDefault();
    resultCount = 0;
    $('.recent-matches').empty();
    $('.page__controls').removeClass('is-visible');

    fetchMaps();
    $('.description-box').addClass('is-visible');
    $('.description-box__name').html("Status");
    $('.description-box__description').html("Searching for recent matches.");
    $('.preloader__background').addClass('is--loading');
  });

  // Various click events for toggling UI elements.
  $("#recent-matches").delegate(".match-card", "click", function() {
    $(this).toggleClass('medals-visible');
    $(this).next('.match-card__report').toggleClass('is-visible');
    $('.description-box').removeClass('is-visible');
  });

  // Close the match card when the close icon is clicked.
  $("#recent-matches").delegate(".close-button", "click", function() {
    $(this).closest('.match-card__report').removeClass('is-visible');
    $(this).closest('.match-card__report').prev('.match-card').removeClass('medals-visible');
    $('.description-box').removeClass('is-visible');
  });

  // When a medal is clicked, display the description in the message modal.
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

  $('.link--with-popup').magnificPopup({
    type: 'inline',
    fixedContentPos: false,
    fixedBgPos: true,
    overflowY: 'auto',
    closeBtnInside: true,
    preloader: false,
    midClick: true,
    removalDelay: 300,
    mainClass: 'my-mfp-zoom-in'
  });

  $("#recent-matches").delegate(".detail__list-item", "click", function() {
    $(this).toggleClass('is-visible');
  })

  $("#recent-matches").delegate(".team-list__toggle", "click", function() {
    if ($(this).hasClass('team--is-visible')) {
      $(this).toggleClass('team--is-visible');
      $(this).text("Show");
      $(this).parent().next('.team__table').hide();
    }
    else {
      $(this).toggleClass('team--is-visible');
      $(this).text("Hide");
      $(this).parent().next('.team__table').show();
    }
  })

  window.onload = function() {
    // Session storage
    // Replace + characters with spaces for the input field.
    var urlParameter = getUrlParameter('gamertag');

    // Check to see if our url has a parameter set already.
    if (urlParameter != undefined) {
      var urlGamertag = urlParameter.replace(/\+/g,' ');
      $('.input-field').val(urlGamertag);
    } 
    else {
      // If sessionStorage is storing default values, exit the function and do 
      // not restore data.
      if (sessionStorage.getItem('gamertag') == "gamertag") {
        return;
      }

      // If values are not blank, restore them to the fields.
      var storedGamertag = sessionStorage.getItem('gamertag');
      if (storedGamertag !== null) $('.input-field').val(storedGamertag);
    }
    
  }

  // Before refreshing the page, save the gamertag data to sessionStorage.
  window.onbeforeunload = function() {
    sessionStorage.setItem("gamertag", $('.input-field').val());
  }

  // Parse the URL parameter so that users can bookmark
  // the site with their own gamertag and don't have to interact with the form.
  var getUrlParameter = function getUrlParameter(sParam) {
    var sPageURL = decodeURIComponent(window.location.search.substring(1)),
      sURLVariables = sPageURL.split('&'),
      sParameterName,
      i;

    for (i = 0; i < sURLVariables.length; i++) {
      sParameterName = sURLVariables[i].split('=');

      if (sParameterName[0] === sParam) {
          return sParameterName[1] === undefined ? true : sParameterName[1];
      }
    }
  };

  // Function for replacing parameters.
  function replaceUrlParam(url, paramName, paramValue){
      var pattern = new RegExp('\\b('+paramName+'=).*?(&|$)')
      if(url.search(pattern)>=0){
          return url.replace(pattern,'$1' + paramValue + '$2');
      }
      return url + (url.indexOf('?')>0 ? '&' : '?') + paramName + '=' + paramValue 
  }

})(jQuery);
