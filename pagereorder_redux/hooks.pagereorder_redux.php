<?php
class Hooks_pagereorder_redux extends Hooks {

  public $meta = array(
     'name'       => 'Page Reorder Redux',
     'version'    => '0.3.0',
     'author'     => 'Frak Lopez',
     'author_url' => 'http://fraklopez.com'
   );


  // Add css
  public function control_panel__add_to_head() {
    if (URL::getCurrent(false) === '/entries') {
      $add_on = 'pagereorder_redux';
      $base_url = Config::get('_site_url', '/');

      return '<link rel="stylesheet" href="'. $base_url .'/_add-ons/' .
              $add_on .'/css/'. $add_on . '.css" media="all" ' .
              'type="text/css"></link>';
    }
  }


  // JavaScript
  public function control_panel__add_to_foot() {
    if (URL::getCurrent(false) === '/entries') {
      $add_on = 'pagereorder_redux';
      $base_url = Config::get('_site_url', '/');

      return '<script type="text/javascript" src="'. $base_url .
              '/_add-ons/'. $add_on .'/js/jquery.'. $add_on .'.js"></script>';
    }
  }


  // Reorder hook
  public function pagereorder_redux__reorder() {
    $response = array(
      'linkage' => null,
      'message' => 'No order data received. Please try again.',
      'status' => 'error'
    );

    // Get current user, to check if we're logged in.
    if ( !Auth::isLoggedIn()) {
      exit('Invalid Request');
    }

    // Get POST data from request.
    $order = Request::post('order', false);
    $entry_folder = Request::post('entry_folder', false);

    // Make sure we've got a response.
    if (!$order || !$entry_folder) {
      Log::error($response['message'], 'pagereorder_redux');
      echo json_encode($response);
      return false;
    }

    // Array of page order objects.
    $page_order = json_decode($order);

    if(isset($page_order[0]->url) && $page_order[0]->url != '') {
      $response = $this->order_set($page_order, $entry_folder);
    } else {
      $response['message'] = "The data submitted was invalid";
    }

    echo json_encode($response);
    return true;
  }



  // Loops through pages and renames file to new order number
  private function order_set($page_order, $entry_folder) {
    $content_path = Config::getContentRoot();
    $entries = Statamic::get_content_tree('/'. $entry_folder,
                                          3, 5, false, true);
    $result = Array(
      'linkage' => null,
      'message' => 'Page order saved successfully!',
      'status' => 'success'
    );

    // Array to store the links of old data coupled with new data.
    // We return this to the view so we can use JS to update the pathing on the page.
    $links = Array();

    // Loop over original folder structure and rename all folders to
    // reflect the new order.
    $entry_url = implode('/', explode('/', $page_order[0]->url, -1));
    $entry_url = str_replace(Config::getSiteRoot(), '', $entry_folder);
    foreach ($page_order as $page) {
      $page_url = str_replace(Config::getSiteRoot(), '/', $page->url);
      foreach ($entries as $entry) {

        // Store original folder data.
        $file_ext = pathinfo($entry['raw_url'], PATHINFO_EXTENSION);

        // used to generate the old pathing info.
        $old_slug   = $entry['slug'];

        // Match on the URL to get the correct order result for this item.
        if( $page_url == $entry['url'] ) {
          break;
        }
      }


      $slug = explode('/', $page->url);
      $slug = preg_replace("/^\/(.+)/uis", "$1", end($slug));
      $new_name = sprintf("%02d", ($page->index + 1)) .'.'. $slug;
      $old_name = $old_slug;
      $links[] = Array(
        'old' => $old_name,
        'new' => $new_name
      );
      $folder_path = $content_path ."/" .$entry_folder ."/";

      // Generate pathing to pass to rename()
      $new_path = $folder_path . $new_name .'.'. $file_ext;
      $old_path = $folder_path . $old_name .'.'. $file_ext;
      if ($new_path !== $old_path) {

        // Check the old path actually exists and the new one doesn't.
        if (File::exists($old_path) && !File::exists($new_path)) {
          rename($old_path, $new_path);
        } else {
          $result['status'] = 'error';
          $result['message'] = 'Aborting: Can\'t guarantee file integrity ' .
                                'for folders '. $old_path .' & '. $new_path;
          Log::error($result['message'], 'pagereorder_redux');
          break;
        }
      }
    }
    if($result['status'] !== 'error') {

      // No error, set links
      $result['linkage'] = $links;
    }

    return $result;
  }
}
