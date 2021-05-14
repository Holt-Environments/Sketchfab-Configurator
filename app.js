/*
 * Holt Environments
 * Anthony Mesa
 * 
 * Custom sketchfab-customiser created for AstroTurf.
 * 
 * For this script to work, the sketchfab api script must also be included
 * on the same page in which this customiser is being implemented.
 * 
 * e.g.
 * <script type="text/javascript" src="
 * https://static.sketchfab.com/api/sketchfab-viewer-1.10.0.js"></script>
 */

//=============================================================================
// Global Control Variables
//=============================================================================

const SKETCHFAB_UID = '3464d838341c4b299d89cd427065738d';
const CONTAINER_NAME = 'sketchfab-customiser';
const SKETCHFAB_IFRAME_ID = 'api-iframe';

//=============================================================================
// Sketchfab Client Object
//=============================================================================

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
  types: [],
  active_object: null,

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

      if (sfc.getName(element) != "#") {
        sfc.types.push(element);
      }
    }

    console.log("sfc.setTypes - Types:");
    console.log(sfc.types);
  },

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
    console.log("sfc.setInitialObjectsVisible - types length = " +
      sfc.types.length);

    for(let i = 0; i < sfc.types.length; i++)
    {
      console.log("sfc.setInitialObjectsVisible - setting " + i);

      var type_object = sfc.types[i];
      var initial_option_object= type_object.children[0];
      
      sfc.showObject( type_object, initial_option_object );
    }
  },

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
      } else
      {
        sfc.api.hide(curr_id);
      }
    }
  },

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

  /**
   * Creates a dictionary object with key/value pairs of type-object names and
   * the objects themselves.
   * 
   * @returns Object with key value pairs of type names and their 3d object
   * id counterpart.
   */
  getOptionTypes: function()
  {
    var types = {};

    for(let i = 0; i < sfc.types.length; i++)
    {
      if(sfc.types[i].name.split('_')[0] == "#")
      {
        continue;
      }
      
      var name = sfc.types[i].name.split('_')[0];
      var type_object = sfc.types[i];

      if(!(name in types))
      {
        types[name] = type_object;
      }
    }

    return types;
  },

  /**
   * Gets a list of the options available for a type given a list of
   * filter words.
   * 
   * 
   * 
   * @param {object} _type_object object representing the current type
   * @param {array} _filter array of string values to be used for filtering
   * available objects based off of the object's name contents.
   * @returns 
   */
  getOptions: function(_type_object, _filter)
  {
    var options = {};

    for(let i = 0; i < _type_object.children.length; i++)
    {
      var option_name_array = sfc.getOptionName(_type_object, i);

      if (_filter.length == 0) {
        options = sfc.getOptionsNoFilter(option_name_array);
      } else
      {

      }

      if(_filter.length != 0)
      {
        console.log('sfc.getOptions - filter exists');

        // [option-name, #, filter1, filter2, filter3] > 1
        var filter_index = option_name_array.indexOf('#');

        if(filter_index != -1)
        {
          var filter = option_name_array.slice(filter_index + 1, option_name_array.length);

          // for each element in the filter that was provided > filter1 
          _filter.forEach(element1 =>
          {
            // for each element in the filter spliced from object name 
            // > filter1, filter2, filter3
            filter.forEach(element =>
            { 
              if(element == element1)
              {

                var option_name = option_name_array.slice(0, filter_index).join(' ');
                
                console.log("sfc.getOptions - option name = " + option_name);

                var id =  _type_object.children[i].instanceID;

                console.log("sfc.getOptions - id = " + id);

                if(!(option_name in options))
                { 
                  options[option_name] = _type_object.children[i];
                }
              }
            });
          });
        } else
        {
          var option_name = option_name_array.join(' ');

          var id =  _type_object.children[i].instanceID;

          if(!(option_name in options))
          {
            options[option_name] = _type_object.children[i];
          }
        }
      } else
      {
        
      }
    }

    console.log("sfc.getOptions - options:");
    console.log(options);

    return options;
  },

  /**
   * Given an index, gets the name of an option object inside of the type
   * object at that index.
   * 
   * @param {object} _type_object sketchfab object that contains all of the
   * type enumerations
   * @param {number} _i An index for accessing the desired child object from 
   * the type object.
   * @returns An array of strings defining the name
   */
   getOptionName: function(_type_object, _i)
   {
     var typeName = sfc.getName(_type_object);
     var option = _type_object.children[_i];
 
     var optionName = sfc.getName(option).split(" ");
    console.log(optionName);

     if (typeName != optionName[0])
     {
       console.log(
         "sfc.getOptions: Error - Naming convention issue discovered" +
         "in object hierarchy."
       );
       console.log(" ~ " + typeName + " " + optionName[0]);
       return null;
     } else
     {
       optionName.shift();
       return optionName;
     }         
   },


  getOptionsNoFilter: function(_option_name_array, _options)
  {
    var filter_index = _option_name_array.indexOf('#');
    var option_name;

    if(filter_index != -1) {
      option_name = _option_name_array.slice(0, filter_index).join(' ');
    } else {
      console.log("sfc.getOptionsNoFilter - _option_name_array "
        + _option_name_array);
      option_name = _option_name_array.join(' ');
    }

    if(!(option_name in _options)) {
      _options[option_name] = _type_object.children[i];
    }
  },


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

var ui = {

  options_filter: [],

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

    var sketchfab_iframe = document.createElement('iframe');
    sketchfab_iframe.id = SKETCHFAB_IFRAME_ID;
    Object.assign(sketchfab_iframe.style, {
        "width": "100%",
        "height": "100%",
        "z-index": "1"
    });
    sketchfab_iframe.setAttribute("allow", "autoplay; fullscreen; vr");
    sketchfab_iframe.setAttribute("allowvr", "");
    sketchfab_iframe.setAttribute("allowfullscreen", "");
    sketchfab_iframe.setAttribute("mozallowfullscreen", "true");
    sketchfab_iframe.setAttribute("webkitallowfullscreen", "true");

    sketchfab_customizer = document.getElementById(CONTAINER_NAME);
    sketchfab_customizer.appendChild(option_types_panel);
    sketchfab_customizer.appendChild(options_panel);
    sketchfab_customizer.appendChild(filter_panel);
    sketchfab_customizer.appendChild(sketchfab_iframe);
  },

    /**
     * Loads the ui dynamically depending on the elements in the sketchfab view.
     */ 
    load: function()
    {
        ui.loadOptionsPanel();
        ui.loadFilterPanel();
    },

    loadOptionsPanel: function()
    {            
        var types = sfc.getOptionTypes();

        if(types == null) { 
            console.log("ui.loadOptionsPanel - types was null.");
            return; 
        }

        for(let i = 0; i < Object.keys(types).length; i++)
        { 
            var name = Object.keys(types)[i];
            var type_object = types[Object.keys(types)[i]];

            console.log('ui.loadOptionsPanel - name = ' + name);
            console.log('ui.loadOptionsPanel - type_object = ' + type_object.name);

            var new_button = ui.generateButton(name);  
            new_button.onclick = ((_button, _type_object) => 
            { 
                return function() 
                {
                    ui.openChoicePanel(_type_object);
                    if (_button.classList.contains('option-type-selected'))
                    {
                        _button.classList.remove('option-type-selected');
                    } else 
                    {
                        var buttonss = document.getElementsByClassName('option-type-selected');

                        // having to do this because getElementsByClassName returns a collection
                        // which isnt iterable with forEach
    
                        var buttons = Array.from(buttonss, button => button);
    
                        buttons.forEach( element =>
                        {
                            element.classList.remove('option-type-selected');
                        });
    
                        _button.classList.add('option-type-selected');
                    }
                };
            })(new_button, type_object);

            document.getElementById('option-types-panel').appendChild(new_button);
        }

        document.getElementById('option-types-panel').classList.add('option-types-panel-load-in');
        
    },

    generateButton: function(_text) {

        var button = document.createElement('button');
        button.id = _text;
        button.className = 'options-button';
    
        var button_text_box = document.createElement('div');
        button_text_box.className = 'name-display';
    
        var button_text = document.createElement('span');
        button_text.className = 'button-text';
        button_text.innerHTML = _text;
    
        button_text_box.appendChild(button_text);
        button.appendChild(button_text_box);
    
        return button;
    },    

    loadFilterPanel: function() {

        var filters = sfc.getFilters();

        console.log('ui.loadFilterPanel - filters = ' + filters);

        filters.forEach(element => {

            let filter_button = document.createElement('button');
            filter_button.id = element;
            filter_button.className = 'options-button';
            filter_button.onclick = (event => { ui.setFilter(event); });
    
            let filter_button_text_box = document.createElement('div');
            filter_button_text_box.className = 'name-display';

            let filter_button_text = document.createElement('span');
            filter_button_text.className = 'button-text';
            filter_button_text.innerHTML = element;

            filter_button_text_box.appendChild(filter_button_text);
            filter_button.appendChild(filter_button_text_box);
            document.getElementById('filter-panel').appendChild(filter_button);
        });

        document.getElementById('filter-panel').classList.add('filter-panel-load-in');
    },

    /**
     * 
     * @param {object} _type_object 
     */
    openChoicePanel: function(_type_object) {

        if (sfc.active_object == null) {
            document.getElementById('options-panel').classList.remove('options-panel-hide');
            ui.populatePanel(_type_object);
            document.getElementById('option-types-panel').classList.add('option-types-panel-shadowed');
            document.getElementById('options-panel').classList.add('options-panel-show');
        }
        else if(_type_object != sfc.active_object) {

            if(document.getElementById('options-panel').classList.contains('options-panel-show')) {
                document.getElementById('options-panel').classList.remove('options-panel-show');
                document.getElementById('option-types-panel').classList.remove('option-types-panel-shadowed');
                document.getElementById('options-panel').classList.add('options-panel-hide');

                setTimeout(() => { 
                    document.getElementById('options-panel').classList.remove('options-panel-hide');
                    ui.populatePanel(_type_object);
                    document.getElementById('option-types-panel').classList.add('option-types-panel-shadowed');
                    document.getElementById('options-panel').classList.add('options-panel-show');
                }, 500);
            } else if(document.getElementById('options-panel').classList.contains('options-panel-hide')) {
                document.getElementById('options-panel').classList.remove('options-panel-hide');
                ui.populatePanel(_type_object);
                document.getElementById('option-types-panel').classList.add('option-types-panel-shadowed');
                document.getElementById('options-panel').classList.add('options-panel-show');
            }

        } else {

            if(document.getElementById('options-panel').classList.contains('options-panel-show')) {
                document.getElementById('options-panel').classList.remove('options-panel-show');
                ui.populatePanel(_type_object);
                document.getElementById('option-types-panel').classList.remove('option-types-panel-shadowed');
                document.getElementById('options-panel').classList.add('options-panel-hide');
            } else if(document.getElementById('options-panel').classList.contains('options-panel-hide')) {
                document.getElementById('options-panel').classList.remove('options-panel-hide');
                ui.populatePanel(_type_object);
                document.getElementById('option-types-panel').classList.add('option-types-panel-shadowed');
                document.getElementById('options-panel').classList.add('options-panel-show');
            }
        }

        sfc.active_object = _type_object;
    },

    closeChoicePanel: function() {
        document.getElementById('options-panel').classList.remove('options-panel-show');
        document.getElementById('options-panel').classList.add('options-panel-hide');
        document.getElementById('option-types-panel').classList.remove('option-types-panel-shadowed');
        this.active_panel = null;
    },

    populatePanel: function(_type_object)
    {
        console.log('ui.populatePanel - active panel index is ' + _type_object.instanceID);

        //var buttonsText = '';
        var options = sfc.getOptions(_type_object, this.options_filter);

        document.getElementById('options-panel-content').innerHTML = '';

        if(options != null)
        {
            for(let i = 0; i < Object.keys(options).length; i++)
            {
                var name = Object.keys(options)[i];
                var option_object = options[name];
                
                let button = new ui.generateButton(name);

                button.onclick = ((_option_object) => {
                    return function() {
                        console.log('ui.populatePanel - button clicked');
                        sfc.showObject(_type_object, _option_object);
                    }
                })(option_object);

                document.getElementById('options-panel-content').appendChild(button);
            }
        } else {
            console.log("ui.populatePanel: Error - Options list is empty.");
        }
    },
  
    setFilter: function(event)
    {
        var filter_item = event.currentTarget;

        if(filter_item.classList.contains('filter-on'))
        {
            filter_item.classList.remove('filter-on');
            console.log("ui.setFilter - removed filter item id " + filter_item.id);

            var index = this.options_filter.indexOf(filter_item.id);

            if(index != -1)
            {
                this.options_filter.splice(index, 1);
                console.log("ui.setFilter - current_filter:");
                console.log(this.options_filter);
            }

        } else
        {
            filter_item.classList.add('filter-on');
            console.log("ui.setFilter - added filter item id " + filter_item.id);

            var index = this.options_filter.indexOf(filter_item.id);
            
            if(index == -1)
            {
                this.options_filter.push(filter_item.id);
                console.log("ui.setFilter - current_filter:");
                console.log(this.options_filter);
            }
        }

        console.log("ui.setFilter - active_panel = " + sfc.active_object.name);

        if(sfc.active_object != null)
        {
            console.log("ui.setFilter - active_panel non-null");
            console.log(" ~ active_panel = " + sfc.active_object.name);
            this.populatePanel(sfc.active_object);   
        }
    }
};

ui.init();
sfc.init( document.getElementById( SKETCHFAB_IFRAME_ID ) );

