/**
 * Javascript file for equalizing the heights of the product tiles.
 */


// API Key ba39bd7104bf4cdf8385f925f2e709a1
(function ($) {
  'use strict'

  console.log('working');
  $(function() {
    var params = {
        // Request parameters
        "size": "256",
    };
  
    $.ajax({
        url: "https://www.haloapi.com/profile/h5/profiles/shesjustaglitch/emblem&" + $.param(params),
        beforeSend: function(xhrObj){
            // Request headers
            xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key","ba39bd7104bf4cdf8385f925f2e709a1");
        },
        type: "GET",
        // Request body
        //data: "{body}",
    })
    .done(function(data) {
        alert("success");
    })
    .fail(function() {
        alert("error");
    });
  });

})(jQuery);
