/*
 * App: Sketchfab Picker
 * File: app.js
 * Date: 05/14/2021
 *
 * Developed by Holt Environments
 * Contributors: Anthony Mesa
 * 
 * This is a custom sketchfab-customiser.
 * 
 * For this script to work, the sketchfab api script must also be included
 * on the same page in which this customiser is being implemented.
 * 
 * e.g.
 * <script type="text/javascript" src="
 * https://static.sketchfab.com/api/sketchfab-viewer-1.10.0.js"></script>
 * 
 * THIS CONFIGURATOR WILL ONLY WORK FOR SKETCHFAB MODELS THAT HAVE THE EXACT
 * FILE SETUP AND NAMING CONVENTIONS AS THE BLENDER FILE IN THE 'blend' FOLDER
 * OF THIS PROJECT'S REPO:
 * 
 * https://github.com/anthonymesa/sketchfab-picker
 * 
 * The objects sfc and ui are declared first, and their initialization functions
 * are called at the bottom of this file.
 * 
 */

//==============================================================================
// Global Control Variables
//==============================================================================

const SKETCHFAB_UID = '3464d838341c4b299d89cd427065738d';
const CONTAINER_NAME = 'sketchfab-customiser';
const SKETCHFAB_IFRAME_ID = 'api-iframe';

//==============================================================================
// Sketchfab Client Object
//==============================================================================

/**
 * ' sfc ' stands for sketchfabClient
 * 
 * Container for customiser functionality that relies on sketchfab instance.
 * 
 * At the very least, this object should always have an api field and
 * an init function defined.
 * 
 * Because this is essentially the state machine for the sketchfab customizer,
 * the ui should always make calls to sketchfabClient to get data and never the 
 * other way around.
 * 
 * Fields:
 * - api - API client object
 * - scene_root - Hierarchical root object for easy access to objects in scene.
 * - types - list of type objects
 */
var sfc = {

  api: null,
  filter_root: null,
  type_objects: [],
  active_object: null,

//==============================================================================

  /**
   * Initializes the sketchfab client, populates the scene_root, and then 
   * loads the ui after the client is finished loading.
   * 
   * This function uses the Sketchfab() object which is defined in the
   * sketchfab-viewer script file that should be included at the bottom of
   * the HTML script for the page that will contain the customiser. (See example
   * at top of file)
   * 
   * The Sketchfab client is initialized using the proper UID and a pre-defined
   * object - with success and error callback functions defined within
   * it - as parameters.
   * 
   * @param {string} _iframe HTML id attribute of api-iframe in which to 
   * populate the sketchfab view. 
   */
  init: function (_iframe)
  {
    var client = new Sketchfab(_iframe);

    client.init( SKETCHFAB_UID,
    {
      autostart: 1,
      camera: 0,

      /**
       * Success callback defined for sketchfab client.
       * 
       * After the api is successful and this function is run, the api is
       * started and an event listener is then defined for the api with a 
       * callback that is to be executed when the sketchfab api event
       * 'viewerread' is fired (Which should be when the viewer is available
       * for javascript manipulation).
       * 
       * When the event listener is fired, api.getNodeMap retrieves the nodes
       * from the scene so that direct object manipulation can take place later
       * based on ui actions. It is because of this that ui.load() should always
       * be called on the last line of the getNodeMap callback, given that 
       * getNodeMap() is an asynchronous call and the loading of the ui is
       * entirely dependent on the data recieved from the node map.
       * 
       * If ui.load() is placed anywhere else the ui will fail to load because
       * the ui will try to load before getNodeMap() has finished retrieving
       * node data.
       * 
       * @param {*} _api 
       */
      success: function onSuccess( _api )
      {
        sfc.api = _api;
        sfc.api.start();

        sfc.api.addEventListener( 'viewerready', function()
        {
          sfc.api.getNodeMap(function (_err, _nodes)
          {
            if (_err)
            {
                console.error(_err);
                return;
            }
            
            sfc.setFilterRoot(_nodes);
            sfc.setTypes(_nodes);
            sfc.setInitialObjectsVisible();
            ui.load();

          }.bind(this));
        });
      },
  
      /**
       * Error callback
       */
      error: function onError()
      {
        console.log( 'Viewer error' );
      }
    });
  },

//==============================================================================

  /**
   * Sets the root object of the scene, whose children are type objects.
   * 
   * @param {*} _nodes nodes retrieved from sketchfab api's
   * getNodeMap function.
   */
  setFilterRoot: function(_nodes)
  {
    var scene_root = sfc.getSceneRoot(_nodes);

    for (i = 0; i < scene_root.children.length; i++)
    {
      var element = scene_root.children[i];

      if (sfc.getName(element) == "#") {
        sfc.filter_root = element;
      }
    }
  },

//==============================================================================

  /**
   * Gets the scene root from the sketchfab viewer.
   * 
   * @param {*} _nodes nodes retrieved from sketchfab api's
   * getNodeMap function.
   * @returns scene root object
   */
  getSceneRoot: function(_nodes)
  {
    var keys = Object.keys(_nodes);

    for (var i = 0; i < keys.length; i++)
    {
      if (_nodes[keys[i]].name == "GLTF_SceneRootNode")
      {
        scene_root = _nodes[keys[i]];
      }
    }

    return scene_root;
  },

//==============================================================================

  /**
   * Cut off the _# part of the name that sketchfab appends to every object.
   * 
   * e.g. 'type-name_01' => 'type-name'
   * 
   * @param {*} _object a sketchfab node object with a .name attribute
   * @returns a string name
   */
   getName: function(_object)
   {
     return _object.name.split('_')[0]
   },

//==============================================================================

  /**
   * Sets the types list for this sketchfab object. Because the types exist
   * as children of the root node, we only have to iterate across the root's
   * children and push all children whose name isnt '#' to the sfc.types list.
   * '#' is the designator for the filters, and thus should not be read as
   * a type.
   * 
   * @param {*} _nodes nodes retrieved from sketchfab api's
   * getNodeMap function.
   */
  setTypes: function(_nodes)
  {
    var scene_root = sfc.getSceneRoot(_nodes);

    for (i = 0; i < scene_root.children.length; i++)
    {
      var element = scene_root.children[i];

      // Because '#' is the designated name for the filter object, we dont want
      // to include this in our type list.
      if (sfc.getName(element) != "#") {
        sfc.type_objects.push(element);
      }
    }
  },

//==============================================================================

  /**
   * This function is responsible for making sure that on load, only the 
   * first element of each "type" is visible. Else, all objects in the scene
   * will show up at once and overlap.
   * 
   * The best method so far is to iterate across the types and call showObject
   * with that iterated type and its first child element
   */
  setInitialObjectsVisible: function()
  {
    for(let i = 0; i < sfc.type_objects.length; i++)
    {
      var type_object = sfc.type_objects[i];
      var initial_option_object= type_object.children[0];
      
      sfc.showObject( type_object, initial_option_object );
    }
  },

//==============================================================================

  /**
   * Given a type and an object that is a child of said type, show the object
   * provided and hide all other objects within the type.
   * 
   * Becuse Sketchfab api's show and hide functions require instanceIDs as 
   * parameters, we iterate through the objects in type_object's children
   * and find a match for the type and provided object's id's, so we know 
   * which one to hide.
   * 
   * In the case an object is provided as a parameter that doesnt exist in the 
   * type or vis versa, then nothing will happen.
   * 
   * @param {number} _type_object Type object whose children should contain
   * the _option_object
   * @param {number} _option_object Scene object to be shown
   */
  showObject: function(_type_object, _option_object)
  {    
    var option_object_list = _type_object.children;

    for(let i = 0; i < option_object_list.length; i++)
    {
      var curr_id = option_object_list[i].instanceID;
      var object_id = _option_object.instanceID;

      if (object_id == curr_id)
      {
        sfc.api.show(object_id);
      }
      else
      {
        sfc.api.hide(curr_id);
      }
    }
  },

//==============================================================================

  /**
   * Transforms the object represented by _myNode using the translation
   * matrix provided in _pos. 
   * 
   * This function forwards a call to Sketchfab's native 'translate' operation
   * which takes four parameters:
   * 
   * - _myNode - The scene node to be translated
   * - _pos - The matrix transformation to be applied
   * - { ... } - A dictionary object with api predefined attributes
   * - cb - A callback to define functionality in the event of success or error
   * 
   * @param {object} _myNode Node object to be transformed
   * @param {number[]} _pos Translation matrix to be applied
   */
  translateObject: function(_myNode, _pos)
  {
    sfc.api.translate(_myNode, _pos,
      {
        duration: 1.0,
        easing: 'easeOutQuad'
      },

      function(err, translateTo)
      {
        if (!err)
        {
          window.console.log(
            'sfc.translateObject - Object has been translated to', 
            translateTo
          );
        }
      }
    );
  },

//==============================================================================

  /**
   * Creates a dictionary object with key/value pairs of type-object names and
   * the objects themselves.
   * 
   * When getting the types from sfc, this would be the desired option to get
   * them because sfc.type_objects are just the objects alone.
   * 
   * @returns Object with key value pairs of type names and their 3d object
   * id counterpart.
   */
  getOptionTypes: function()
  {
    var types = {};

    for(let i = 0; i < sfc.type_objects.length; i++)
    {
      var name = sfc.getName(sfc.type_objects[i]);
      var type_object = sfc.type_objects[i];

      if(!(name in types))
      {
        types[name] = type_object;
      }
    }

    return types;
  },

//==============================================================================

  /**
   * Gets a dictionary list of the options available for a type given a list of
   * filter words. The key of the dictionary is the object's name, where the
   * value is the sketchfab javascript object itself.
   * 
   * If a filter is not provided, then the names of all children of the given
   * type will be added to the options dictionary, though if a filter is
   * provided, only those elements being filtered will be shown.
   * 
   * @param {object} _type_object object representing the current type
   * @param {array} _ui_filter array of string values to be used for filtering
   * available objects based off of the object's name contents.
   * @returns 
   */
  getOptions: function(_type_object, _ui_filter)
  {
    var options = {};
    var option_name = '';

    for(let i = 0; i < _type_object.children.length; i++)
    {
      var option_name_array = sfc.getOptionInfo(_type_object, i);
      
      // If an error occured in getOptionInfo, then we have no data
      // to work with and should move to the next child.
      if(option_name_array == null) { continue; }

      if (_ui_filter.length == 0)
      {
        option_name = sfc.extractNameUnfiltered(option_name_array);
      }
      else
      {
        option_name = sfc.extractNameFiltered(option_name_array, _ui_filter);
      }

      // If the option name is null, dont try to append to the 
      // options dictionary, loop again.
      if(option_name == null) { continue; }

      if(!(option_name in options))
      {
        options[option_name] = _type_object.children[i];
      }
    }

    return options;
  },

//==============================================================================

  /**
   * Given an index, gets the name of an option object inside of the type
   * object at that index.
   * 
   * The name found and returned is equivalent to the name of the object
   * in the blender file uploaded to sketchfab.
   * 
   * @param {object} _type_object sketchfab object that contains all of the
   * type enumerations
   * @param {number} _i An index for accessing the desired child object from 
   * the type object.
   * @returns An array of strings defining the object's name
   */
  getOptionInfo: function(_type_object, _i)
  {
    var type_name = sfc.getName(_type_object);
    var option = _type_object.children[_i];
 
    var option_name = sfc.getName(option).split(" ");

    if (type_name != option_name[0])
    {
      console.log(
        "sfc.getOptions: Error - Naming convention issue discovered" +
        "in object hierarchy."
      );
      console.log(" ~ " + type_name + " " + option_name[0]);
      return null;
    }
    else
    {
      option_name.shift();
      return option_name;
    }         
  },

//==============================================================================

  /**
   * Gets name from name array.
   * 
   * Filtering is not taken into account when retrieving the name,
   * so unless of a fatal error, this shouldnt ever really return null.
   * 
   * @param {[string]} _option_name_array Array representation of a Sketchfab
   * object's name
   * @returns A string name
   */
  extractNameUnfiltered: function(_option_name_array)
  {
    var option_name;
    var filter_index = _option_name_array.indexOf('#');

    if(filter_index != -1)
    {
      option_name = _option_name_array.slice(0, filter_index).join(' ');
    } 
    else
    {
      option_name = _option_name_array.join(' ');
    }

    if (option_name == null)
    {
      console.log("sfc.extractNameUnfiltered - Option name from " +
      _option_name_array.toString() + " is null");
    }

    return option_name;
  },

//==============================================================================

  /**
   * Gets name from name array.
   * 
   * Filtering is taken into account, so it is possible/probable for
   * option_name to return null in the event that the object defined
   * by _option_name_array does not have a filter property matching any
   * element in the filter set defined by _ui_filter.
   * 
   * e.g. 
   *  If _option_name_array = ['name', '#', 'filter-a']
   *  and _ui_filter = ['filter-b', 'filter-c']
   *  then null will be returned because the option name array does not
   *  contain filter values 'filter-b' or 'filter-c'.
   * 
   * @param {[string]} _option_name_array Array representation of a Sketchfab
   * object's name
   * @param {[string]} _ui_filter An array of strings to be used as a filter
   * @returns A string name
   */
  extractNameFiltered: function(_option_name_array, _ui_filter)
  {
    var option_name;
    var filter_index = _option_name_array.indexOf('#');

    if(filter_index != -1)
    {
      var option_filter = _option_name_array.slice(
        filter_index + 1, 
        _option_name_array.length
      );

      // The breaks in this for loop ensure that only one of 
      // the elements in the _ui_filter need to be found for
      // the option_name to be returned.
      for (let ui_filter_element of _ui_filter)
      {
        for (let option_filter_element of option_filter)
        { 
          if(option_filter_element == ui_filter_element)
          {
            option_name = _option_name_array.slice(0, filter_index).join(' ');
            break;
          }
        }

        if (option_name != null) { break; }
      }
    }
    else
    {
      option_name = _option_name_array.join(' ');
    }

    if (option_name == null)
    {
      console.log("sfc.extractNameFiltered - Filter '" + _ui_filter.toString() +
      "' could not be applied to " + _option_name_array.toString() +
      ", so name is null");
    }

    return option_name;
  },

//==============================================================================

  /**
   * Get the filters available from the blend file.
   * 
   * Filters shoulld be geometric objects with a single vertex at its origin
   * parented to a single empty node with the name # that is a child
   * of the root level. That is, in blender the filter is found at:
   * 
   * root
   *  |_ (empties for object catagories)
   *  |_ ...
   *  |
   *  |_ #   <-- name of the filter empty should ONLY be '#'
   *     |_ filter1
   *     |_ filter2
   * 
   * Thus the returned array from the example blender scene structure above
   * should be ['filter1', 'filter2']
   */
  getFilters: function()
  {
      var filter_names = [];

      // Iterate across the children of filter_root to create the
      // filter_names array

      for(let i = 0; i < sfc.filter_root.children.length; i++)
      {
          filter_names.push(sfc.filter_root.children[i].name.split('_')[0]);
      }

      return filter_names;
  }
};

//==============================================================================
// ui object
//==============================================================================

/**
 * This is the ui object responsible for drawing the interactive ui for the 
 * sketchfab customizer. The generation of the ui is dynamic and based on the
 * data available within the sketchab client object 'sfc' above. 
 * 
 * sfc object should never access the ui, rather the ui accesses sfc to 
 * get its data.
 */
var ui = {

  options_filter: [],
  animating: false,

//==============================================================================

  /**
   * Populate the sketchfab customiser with the required elements for UI and 
   * sketchfab iframe. Hierarchy is:
   * 
   * sketchfab customizer div
   * |_ option types panel
   * |_ options panel
   * |  |_ panel content
   * |_ filter panel
   * |_ api iframe
   */
  init: function()
  {
    var option_types_panel = document.createElement('div');
    option_types_panel.id = 'option-types-panel';
    option_types_panel.classList.add
    (
      'no-scrollbar',
      'no-scrollbar::-webkit-scrollbar'
    );

    var options_panel = document.createElement('div');
    options_panel.id = 'options-panel';

    var options_panel_content = document.createElement('div');
    options_panel_content.id = 'options-panel-content';
    options_panel.appendChild(options_panel_content);

    var filter_panel = document.createElement('div');
    filter_panel.id = 'filter-panel';

    var api_iframe = document.createElement('iframe');
    api_iframe.id = SKETCHFAB_IFRAME_ID;
    Object.assign(api_iframe.style, {
      "width": "100%",
      "height": "100%",
      "z-index": "1"
    });
    api_iframe.setAttribute("allow", "autoplay; fullscreen; vr");
    api_iframe.setAttribute("allowvr", "");
    api_iframe.setAttribute("allowfullscreen", "");
    api_iframe.setAttribute("mozallowfullscreen", "true");
    api_iframe.setAttribute("webkitallowfullscreen", "true");

    sketchfab_customizer = document.getElementById(CONTAINER_NAME);
    sketchfab_customizer.appendChild(option_types_panel);
    sketchfab_customizer.appendChild(options_panel);
    sketchfab_customizer.appendChild(filter_panel);
    sketchfab_customizer.appendChild(api_iframe);
  },

//==============================================================================

  /**
   * Loads the ui dynamically depending on the elements in the sketchfab view.
   */ 
  load: function()
  {
    ui.loadOptionsPanel();
    ui.loadFilterPanel();
  },

//==============================================================================

  /**
   * Loads the options panel dynamically by first creating a button, setting its
   * onclick method, appending it to the option_types_panel and then repeating
   * for each element in sfc.types.
   * 
   * @returns 
   */
  loadOptionsPanel: function()
  {            
    var types = sfc.getOptionTypes();

    // If types are null, then there are no options to types to be displayed,
    // so skip creating panel.
    if(types == null) { 
        console.log("ui.loadOptionsPanel - types was null.");
        return; 
    }

    var option_types_panel = document.getElementById('option-types-panel');

    for (let name of Object.keys(types)){

      var type_object = types[name];
      var new_button = ui.generateButton(name);  
      
      // I really havent found a good way to clean this up. Essentially, onclick
      // is being assigned to an anonymous function that takes the arguments
      // new_button and type_object on line 674. Those parameters are then
      // passed as arguments to an anonymous function inside the first that is
      // called on the first anonymous function's return. This approach has only
      // been taken due to the scopes that the variables normally exist in when
      // called by this asynchronous onclick method. There is probably a better
      // way to achieve this.
      new_button.onclick = ((_button, _type_object) => 
      { 
        return function() 
        {
          ui.openChoicePanel(_type_object);
          ui.setButtonSelected(_button);
        };
      })(new_button, type_object);

      option_types_panel.appendChild(new_button);
    }

    option_types_panel.classList.add('option-types-panel-load-in');
  },

//==============================================================================

  /**
   * Generates a button with a uniform style that conforms to the ui.
   * 
   * @param {string} _text 
   * @returns Button object
   */
  generateButton: function(_text)
  {
    // Create button itself
    var button = document.createElement('button');
    button.id = _text;
    button.className = 'options-button';

    // Here we are creating an image url using the _text parameter provided
    // and then checking on that image's width. If it has a width, then that
    // image exists and will be set as the background, if not, then the
    // default value in the 'options-button' css class will be used.
    {
      let image = new Image();
      let image_url = "imgs/" + _text + ".png";
      image.src = image_url;
      
      // Do this on load so that it is only evaluated after the image has
      // been loaded (or else reading width will always return 0).
      image.onload = function() 
      {
        if (image.width != 0) {
          button.setAttribute("style", "background-image: " +
          "url('" + image_url + "') !important;");
        }  
      }
    }
    
    // Create nice looking text box
    var button_text_box = document.createElement('div');
    button_text_box.className = 'name-display';

    // Create text
    var button_text = document.createElement('span');
    button_text.className = 'button-text';
    button_text.innerHTML = _text.toUpperCase();

    button_text_box.appendChild(button_text);
    button.appendChild(button_text_box);

    return button;
  },    

//==============================================================================

  /**
   * Opens the panel for displying the options available for a type by applying
   * classes for animation.
   * 
   * @param {object} _type_object 
   */
  openChoicePanel: function(_type_object)
  {
    let hide_class = 'options-panel-hide';
    let show_class = 'options-panel-show';
    let shadowed_class = 'option-types-panel-shadowed';

    let options_panel = document.getElementById('options-panel');
    let option_types_panel = document.getElementById('option-types-panel');

    /**
    * Show options panel, populating it inbetween css animations.
    */
    function show_panel()
    {
      options_panel.classList.remove(hide_class);
      // Populate the panel before it is visible again
      ui.populateOptions(_type_object);
      option_types_panel.classList.add(shadowed_class);
      options_panel.classList.add(show_class);
    }

    /**
    * Hide options panel using css animations.
    */
    function hide_panel()
    {
      options_panel.classList.remove(show_class);
      option_types_panel.classList.remove(shadowed_class);
      options_panel.classList.add(hide_class);
    }

    // Declaring values for readability 

    let active_panel_not_set = sfc.active_object == null;
    let new_type_selected = _type_object != sfc.active_object;
    // let same_type_selected = _type_object == sfc.active_object;

    /**
    * Select new type based on its current state. The timeout is necessary, so
    * that showing the panel happens only after hiding the panel has been 
    * completed.
    */
    function select_new_type()
    {
      if(options_panel.classList.contains(show_class))
      {
        // This gets the milliseconds of the transition of the show_class css.
        // This is then passed to the timeout function so that the timeout
        // always executes only after the css transitions are finished.
        const elem = document.querySelector('.' + show_class);
        const duration = window.getComputedStyle(elem).transitionDuration;
        const milli = parseFloat(duration.slice(0,duration.length)) * 1000;

        hide_panel();
        setTimeout(() => { show_panel();}, milli);
      }
      else if(options_panel.classList.contains(hide_class))
      {
        show_panel();
      }
    }

    /**
    * Select the same type, nothing fancy here, just hiding if shown and
    * showing if hidden.
    */
    function select_same_type()
    {
      if(options_panel.classList.contains(show_class))
      {
        hide_panel()
      }
      else if(options_panel.classList.contains(hide_class))
      {
        show_panel();
      }
    }

    // Show or hide panel based on whether user has selected a different type
    // or the same type.
    if (active_panel_not_set)
    {
      show_panel();
    }
    else if(new_type_selected)
    {
      select_new_type();
    }
    else
    {
      select_same_type();
    }

    // Set active object to current object selected.
    sfc.active_object = _type_object;
  },

//==============================================================================

  /**
   * Populates options panel based on type selected.
   * 
   * @param {object} _type_object Type for which to display options.
   */
  populateOptions: function(_type_object)
  {
    let options_panel = document.getElementById('options-panel-content');
    var options = sfc.getOptions(_type_object, ui.options_filter);

    if (options == null)
    {
      console.log("ui.populatePanel: Error - Options list is empty.");
    }
    else
    {
      // Clear buttons so they can be repopulated.
      options_panel.innerHTML = '';

      for (let name of Object.keys(options))
      {
        var option_object = options[name];
        
        let option_button = ui.generateButton(name);

        // Here the onclick anonymous function is applied the same as it is in
        // ui.loadOptionsPanel(). This simply makes a call to sfc.showObject().
        option_button.onclick = ((_option_object) => {
          return function()
          {
            sfc.showObject(_type_object, _option_object);
          }
        })(option_object);

        options_panel.appendChild(option_button);
      }
    }
  },

//==============================================================================

  /**
   * Sets or removes the 'button selected' css class for a button.
   * 
   * @param {object} _button 
   */
  setButtonSelected: function(_button)
  {
    // The name of the css class that designates a button is selected
    var selected_class = 'option-type-selected';

    if (_button.classList.contains(selected_class))
    {
      _button.classList.remove(selected_class);
    }
    else 
    {
      var button_collection = document.getElementsByClassName(selected_class);

      // having to do this because getElementsByClassName returns a collection
      // which isnt iterable with forEach. Mapping button from collection to 
      // button in array.

      var button_list = Array.from(button_collection, button => button);

      button_list.forEach( element =>
      {
        element.classList.remove(selected_class);
      });

      _button.classList.add(selected_class);
    }
  },

//==============================================================================

  /**
   * Loads filter panel by creating buttons for each element in the list of
   * filter names received by sfc.getFilters().
   */
  loadFilterPanel: function() {
    var filters = sfc.getFilters();

    for (let filter_element of filters) 
    {
      let filter_button = ui.generateButton(filter_element);  
      filter_button.onclick = (event => {
        ui.updateFilter(event);
      });

      document.getElementById('filter-panel').appendChild(filter_button);
    }

    document.getElementById('filter-panel').classList.add('filter-panel-load-in');
  },



//==============================================================================

  /**
   * Updates the filter used for displaying the elements in the options panel.
   * 
   * @param {object} event Html event object that ran the updateFilter command, 
   * i.e. the event fired from the button that was clicked.
   */
  updateFilter: function(event)
  {
    let filter_on = 'filter-on';
    var filter_item = event.currentTarget;
    let filter_option_set = filter_item.classList.contains(filter_on);

    // If the filter option that was clicked is currently set, it needs to be
    // removed from the filter, else it wasnt set and it should be added to 
    // the filter array.
    if(filter_option_set)
    {
      filter_item.classList.remove(filter_on);

      // If the filter option defined by the html id of the button clicked
      // exists in the options_filter array, then remove it from the array.
      var index = ui.options_filter.indexOf(filter_item.id);
      if(index != -1)
      {
        this.options_filter.splice(index, 1);
      }
    }
    else
    {
      filter_item.classList.add(filter_on);

      // If the filter option doesnt exist, add it to the filter list.
      var index = this.options_filter.indexOf(filter_item.id);
      if(index == -1)
      {
        this.options_filter.push(filter_item.id);
      }
    }

    // ui.populateOptions is run when the ui filter is updated so that the
    // changes are reflected immediately without having to open/close the
    // options panel again.
    if(sfc.active_object != null)
    {
      this.populateOptions(sfc.active_object);   
    }
  }
};

//==============================================================================
// App start
//==============================================================================

ui.init();
sfc.init( document.getElementById( SKETCHFAB_IFRAME_ID ) );

