;(function () {
  "use strict";

  var sortTimer = null,
      flashBar = $('#status-bar'),
      fixHelper, flashes, flashMessage, getParam,
      initialize, orderGet, orderSubmit, tableInfoUpdate;

  // Flash messages
  flashes = {
    success: _.template("<div id=\"flash-msg\" class=\"success\">\n" +
            "<span class=\"icon\"></span>\n" +
            "<span class=\"msg\"><%= message %></p>\n</div>"),
    error: _.template("<div id=\"flash-msg\" class=\"error\">\n" +
            "<span class=\"icon\"></span>\n" +
            "<span class=\"msg\"><%= message %></p>\n</div>")
  };

  flashBar.on('flash', function(e, data) {
    flashMessage(data);
  });


  // Shows flash message
  flashMessage = function(data) {
    var delay = 50,
        existingMessage, html;

    // Remove previous flash message if it exists
    if($('#flash-msg').length) {
      delay = 150;
      existingMessage = $('#flash-msg');
      existingMessage.stop(true).fadeOut(delay, function() {
        existingMessage.remove();
      });
    };
    html = flashes[data.status]({message: data.message});
    flashBar.prepend(html);
    $('#flash-msg').delay(delay)
            .animate({'margin-top' : '0'}, 900, 'easeOutBounce')
            .delay(3000)
            .animate({'margin-top' : '-74px'},
              900,
              'easeInOutBack',
              function() {
                $(this).remove();
              }
            );
  };


  // Return a helper with preserved width of cells
  fixHelper = function(e, ui) {
    ui.children().each(function() {
      $(this).width($(this).width());
    });

    return ui;
  }


  // Sets up the page
  initialize = function() {
    var form = $('form'),
        updateButton = '<div class="btn btn-small set-sort js_set_sort">' +
                          'Update Sort' +
                        '</div>';

    // Only function on number index entries
    if(isNaN(form.find('td.title').next('td').html())) {
      console.log('PageReorder_Redux Only works on # entries');
      return false;
    }

    // Add update button at top and bottom of form
    form.prepend(updateButton)
              .find('.section').after(updateButton);

    $('.js_set_sort').on('click', function(e) {
      if(!$(this).hasClass('disabled')) {

        // Scroll to top to be able to see message
        $("html, body").animate({ scrollTop: "0px" });

        // Add disabled class to prevent multiple submissions
        $('.js_set_sort').addClass('disabled');
        orderSubmit(orderGet(form));
      }
    });

    // Set drag handle for rows
    form.find('.checkbox-col input').before(
      '<span class="drag-handle">&#9776;</span>'
    );

    // Set position class to later update Number column
    form.find('td.title').next('td').addClass('position');
    form.find('tbody').sortable({
      // Helper ensures row width while dragging
      helper: fixHelper
    });
  }


  // Gets the new order
  orderGet = function(form) {
    var rows = form.find('tbody tr'),
        result = [],
        i, len, page, row, url;

    // Loop through all rows
    for (i = 0, len = rows.length; i < len; i++) {
      page = $(rows[i]);

      // Set values
      result.push({
        index: page.index(),
        url: $.trim(page.find('a.entry-view').attr('href'))
      });
    }

    return JSON.stringify(result);
  }


  // Submits the new order
  orderSubmit = function(data) {
    var baseURL = window.location.href.split('admin.php');
    $.ajax(baseURL[0]+"TRIGGER/pagereorder_redux/reorder", {
      type: 'POST',
      data: {
        order: data,
        entry_folder: getParam('path')
      },
      complete: function(jqxhr) {
        var flashObj = {
              status: 'error',
              message: 'There was an error saving your page order.' +
                        'Please try again.'
            },
            response;

        // Set message to the response we got back
        try {
          response = $.parseJSON(jqxhr.responseText);
          flashObj.message = response.message;
          if (response.status === "success" && (response.linkage != null)) {
            flashObj.status = 'success';

            // Everything good, update table info
            tableInfoUpdate(response.linkage);
          }
        } catch (e) {
          flashObj.message = 'There was an issue with your data.';
        }

        $('.js_set_sort').removeClass('disabled');
        return flashBar.triggerHandler('flash', flashObj);
      },
      error: function(jqxhr, status, error) {
        $('.js_set_sort').removeClass('disabled');

        return flashBar.triggerHandler('flash', {
          status: 'error',
          message: 'There was an error saving your page order.' +
                    'Please try again.'
        });
      }
    });
  };

  getParam = function(name){
    var name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]"),
        regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        params = regex.exec(location.search),
        result = '';
    if(params) {
      result = decodeURIComponent(params[1].replace(/\+/g, " "));
    }
    return result;
  }


  // Updates the table with updated links
  // also updates the Number column
  tableInfoUpdate = function(links) {
    var $tree = $('.simple-table'),
        a, anchors, link, links, _i, _j, _len, _len1;

    // Update links
    for (_i = 0, _len = links.length; _i < _len; _i++) {
      link = links[_i];
      if (!(link.old !== link["new"])) {
        continue;
      }
      anchors = $tree.find("a[href*='" + link.old + "']");
      for (_j = 0, _len1 = anchors.length; _j < _len1; _j++) {
        a = anchors[_j];
        a.href = a.href.replace("" + link.old, "" + link["new"]);
      }
    }

    // Update Number column with new order
    $tree.find('.ui-sortable tr').each(function(index) {
      var val = index + 1;
      if( val.toString().length < 2 ) {
        val = "0" + val;
      }

      return $(this).find('.position').html(val);
    });
  }


  // Start the show
  initialize();
}).call(this);
